import sys
import os

# Save a duplicate of file descriptor 1 (stdout) and redirect descriptor 1 to descriptor 2 (stderr) at the OS level
# to prevent any C-level libraries, sub-processes, or python prints from polluting stdout.
real_stdout_fd = os.dup(1)
os.dup2(2, 1)

import json
import collections
import collections.abc
import numpy as np
import subprocess
import shutil

# Apply monkeypatches for Python 3.12 / NumPy 2.x compatibility
collections.MutableSequence = collections.abc.MutableSequence
collections.Sequence = collections.abc.Sequence
np.float = float
np.int = int
np.bool = np.bool_

# Dynamic CUDA library path configuration for PyTorch/TensorFlow GPU detection in WSL
site_packages_dirs = [d for d in sys.path if "site-packages" in d]
nvidia_libs = []
for sp in site_packages_dirs:
    nvidia_dir = os.path.join(sp, "nvidia")
    if os.path.exists(nvidia_dir):
        for root, dirs, files in os.walk(nvidia_dir):
            if "lib" in dirs:
                nvidia_libs.append(os.path.join(root, "lib"))

ld_paths = ["/usr/lib/wsl/lib"] + nvidia_libs
current_ld = os.environ.get("LD_LIBRARY_PATH", "")
if current_ld:
    ld_paths.append(current_ld)
os.environ["LD_LIBRARY_PATH"] = ":".join(ld_paths)

# Disable XLA auto-clustering and JIT compilation to avoid the ScanOp cumsum shape inference crash in TF 2.21+
os.environ["TF_XLA_FLAGS"] = "--tf_xla_auto_jit=-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_USE_LEGACY_KERAS"] = "1"

import tensorflow as tf
tf.config.optimizer.set_jit(False)

try:
    tf.config.run_functions_eagerly(True)
except Exception:
    pass

import librosa
from omnizart.chord import app as chord_app

def clean_chord_name(chord):
    if not chord or chord == "N":
        return "𝄾"
    if ":" in chord:
        root, ctype = chord.split(":", 1)
        if ctype == "maj":
            return root
        elif ctype == "min":
            return root + "m"
        elif ctype == "maj7":
            return root + "maj7"
        elif ctype == "min7":
            return root + "m7"
        elif ctype == "7":
            return root + "7"
        elif ctype == "dim":
            return root + "dim"
        elif ctype == "aug":
            return root + "aug"
        else:
            return root + ctype
    return chord

def transcribe_vocals(vocals_path):
    import os
    import numpy as np
    try:
        import sherpa_onnx
        import librosa
        
        model_dir = "/home/gabomarchanta/models/sherpa-onnx-whisper-tiny"
        encoder = os.path.join(model_dir, "tiny-encoder.int8.onnx")
        decoder = os.path.join(model_dir, "tiny-decoder.int8.onnx")
        tokens = os.path.join(model_dir, "tiny-tokens.txt")
        
        if not os.path.exists(encoder) or not os.path.exists(decoder):
            print("PYTHON: [ASR] Modelo Whisper no encontrado en la ruta.", file=sys.stderr)
            return []
            
        print("PYTHON: [ASR] Inicializando reconocedor Whisper...", file=sys.stderr)
        recognizer = sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=encoder,
            decoder=decoder,
            tokens=tokens,
            language="es",
            task="transcribe",
            enable_segment_timestamps=True
        )
        
        print("PYTHON: [ASR] Leyendo y remuestreando audio de voz a 16kHz...", file=sys.stderr)
        audio, sample_rate = librosa.load(vocals_path, sr=16000)
        
        print(f"PYTHON: [ASR] Audio cargado ({len(audio)/16000:.1f}s). Iniciando decodificación en bloques de 30s...", file=sys.stderr)
        
        chunk_samples = 30 * 16000
        segments = []
        
        for start_sample in range(0, len(audio), chunk_samples):
            end_sample = min(len(audio), start_sample + chunk_samples)
            chunk_audio = audio[start_sample:end_sample]
            
            # Si el bloque es menor a 1 segundo, lo saltamos
            if len(chunk_audio) < 16000:
                continue
                
            stream = recognizer.create_stream()
            stream.accept_waveform(16000, chunk_audio)
            recognizer.decode_stream(stream)
            
            res = stream.result
            chunk_offset_time = start_sample / 16000.0
            
            if res and hasattr(res, "segment_texts") and res.segment_texts:
                for text, start, duration in zip(res.segment_texts, res.segment_timestamps, res.segment_durations):
                    cleaned_text = text.strip()
                    # Filtrar marcadores instrumentales de Whisper como "[Música]", "(Música)", "music", "instrumental"
                    import re
                    norm_text = re.sub(r'[^\w\s]', '', cleaned_text).strip().lower()
                    if norm_text not in ["musica", "música", "music", "instrumental", ""]:
                        segments.append({
                            "text": cleaned_text,
                            "start": chunk_offset_time + float(start),
                            "end": chunk_offset_time + float(start + duration)
                        })
                        
        print(f"PYTHON: [ASR] Transcribió {len(segments)} líneas de letra.", file=sys.stderr)
        return segments
    except Exception as e:
        print(f"PYTHON: [WARNING] Error en ASR: {e}", file=sys.stderr)
        return []

def transcribe_song(audio_path):
    try:
        # 1. Separación de Fuentes con Demucs Primero
        print("PYTHON: [DEMUCS] Iniciando separación de fuentes...", file=sys.stderr)
        output_dir = os.path.dirname(audio_path)
        base_name = os.path.basename(audio_path)
        name_without_ext, _ = os.path.splitext(base_name)
        
        separated_dir = os.path.join(output_dir, "separated")
        
        # Determinar ejecutable de demucs desde el virtualenv
        venv_dir = os.path.dirname(sys.executable)
        demucs_bin = os.path.join(venv_dir, "demucs")
        if not os.path.exists(demucs_bin):
            demucs_bin = "demucs"  # fallback a path global
            
        print(f"PYTHON: [DEMUCS] Ejecutando {demucs_bin}...", file=sys.stderr)
        
        # Ejecutamos demucs
        # Usamos htdemucs por defecto (modelo de 4 stems)
        cmd = [demucs_bin, "-o", separated_dir, audio_path]
        subprocess.run(cmd, check=True)
        
        # Buscar el stem "other.wav" (acompañamiento), "drums.wav" (batería) y "vocals.wav" (voz)
        htdemucs_dir = os.path.join(separated_dir, "htdemucs")
        other_wav_path = None
        drums_wav_path = None
        vocals_wav_path = None
        
        if os.path.exists(htdemucs_dir):
            subdirs = os.listdir(htdemucs_dir)
            if len(subdirs) > 0:
                target_subdir = subdirs[0]
                for sd in subdirs:
                    if sd.lower() in name_without_ext.lower() or name_without_ext.lower() in sd.lower():
                        target_subdir = sd
                        break
                other_wav_path = os.path.join(htdemucs_dir, target_subdir, "other.wav")
                drums_wav_path = os.path.join(htdemucs_dir, target_subdir, "drums.wav")
                vocals_wav_path = os.path.join(htdemucs_dir, target_subdir, "vocals.wav")
                
        # 2. Detectar beats y tempo (BPM) con Librosa sobre el audio original (para máxima precisión rítmica)
        print("PYTHON: [LIBROSA] Detectando ritmo sobre el audio original...", file=sys.stderr)
        y, sr = librosa.load(audio_path, sr=22050)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        bpm_val = float(tempo[0]) if isinstance(tempo, (np.ndarray, list)) else float(tempo)
        bpm_val = round(bpm_val, 1)
        print(f"PYTHON: [LIBROSA] BPM estimado: {bpm_val}", file=sys.stderr)

        if other_wav_path and os.path.exists(other_wav_path):
            print(f"PYTHON: [DEMUCS] Acompañamiento aislado con éxito en {other_wav_path}", file=sys.stderr)
            input_transcribe = other_wav_path
        else:
            print("PYTHON: [WARNING] No se pudo encontrar el stem 'other.wav' de Demucs. Usando audio original como fallback.", file=sys.stderr)
            input_transcribe = audio_path
            
        # 4. Ejecutar Omnizart Chord Transcription
        print("PYTHON: [OMNIZART] Iniciando transcripción de acordes...", file=sys.stderr)
        
        # Ejecutar la transcripción con Omnizart
        chord_app.transcribe(input_transcribe, output=output_dir)
        
        # Buscar el archivo CSV generado
        transcribe_base_name = os.path.basename(input_transcribe)
        transcribe_name_without_ext, _ = os.path.splitext(transcribe_base_name)
        
        csv_path = os.path.join(output_dir, transcribe_name_without_ext + ".csv")
        if not os.path.exists(csv_path):
            no_ext_path = os.path.join(output_dir, transcribe_name_without_ext)
            if os.path.exists(no_ext_path) and os.path.isfile(no_ext_path):
                csv_path = no_ext_path
                
        if not os.path.exists(csv_path):
            csv_path_alt = os.path.join(output_dir, transcribe_name_without_ext + "_chord.csv")
            if os.path.exists(csv_path_alt):
                csv_path = csv_path_alt
                
        if not os.path.exists(csv_path):
            csv_path_orig = os.path.join(output_dir, name_without_ext + ".csv")
            if os.path.exists(csv_path_orig):
                csv_path = csv_path_orig
            else:
                no_ext_orig = os.path.join(output_dir, name_without_ext)
                if os.path.exists(no_ext_orig) and os.path.isfile(no_ext_orig):
                    csv_path = no_ext_orig
                else:
                    csv_path_orig_alt = os.path.join(output_dir, name_without_ext + "_chord.csv")
                    if os.path.exists(csv_path_orig_alt):
                        csv_path = csv_path_orig_alt
                    
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"No se pudo encontrar el archivo CSV generado en {csv_path}")
            
        print(f"PYTHON: [OMNIZART] Leyendo acordes desde {csv_path}...", file=sys.stderr)
        
        # 4. Leer los acordes del archivo CSV (soportando comas/tabuladores y orden de columnas)
        raw_chords = []
        with open(csv_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("start") or line.startswith("#"):
                    continue
                parts = line.split("\t") if "\t" in line else line.split(",")
                if len(parts) >= 3:
                    try:
                        val0 = float(parts[0])
                        val1 = float(parts[1])
                        chord_label = parts[2].strip()
                        raw_chords.append((val0, val1, chord_label))
                    except ValueError:
                        try:
                            chord_label = parts[0].strip()
                            val1 = float(parts[1])
                            val2 = float(parts[2])
                            raw_chords.append((val1, val2, chord_label))
                        except ValueError:
                            continue
                            
        print(f"PYTHON: [OMNIZART] Transcritos {len(raw_chords)} acordes.", file=sys.stderr)
        
        # 5. Limpieza de archivos temporales de Omnizart (pero NO Demucs todavía)
        try:
            if os.path.exists(csv_path):
                os.remove(csv_path)
            for name in [transcribe_name_without_ext, name_without_ext]:
                for suffix in ["", "_chord"]:
                    mid_file = os.path.join(output_dir, f"{name}{suffix}.mid")
                    if os.path.exists(mid_file):
                        os.remove(mid_file)
        except Exception as err:
            print(f"PYTHON: [WARNING] Error al limpiar archivos de Omnizart: {err}", file=sys.stderr)
            
        # 6. Mapear acordes a beats usando el algoritmo de Votación Mayoritaria (Majority Voting Beat Alignment)
        # En lugar de tomar una muestra puntual en el instante exacto del beat, analizamos el intervalo
        # completo desde el beat actual al siguiente para determinar el acorde dominante (con mayor duración).
        beat_chords = []
        for idx in range(len(beat_times)):
            start_t = beat_times[idx]
            # Si es el último beat, asumimos la misma duración promedio que los anteriores
            if idx < len(beat_times) - 1:
                end_t = beat_times[idx + 1]
            else:
                avg_duration = (beat_times[-1] - beat_times[0]) / (len(beat_times) - 1) if len(beat_times) > 1 else 0.5
                end_t = start_t + avg_duration
                
            # Calcular la duración del solapamiento para cada acorde detectado por Omnizart
            overlaps = {}
            for start, end, label in raw_chords:
                overlap_start = max(start, start_t)
                overlap_end = min(end, end_t)
                if overlap_start < overlap_end:
                    chord = clean_chord_name(label)
                    duration = overlap_end - overlap_start
                    overlaps[chord] = overlaps.get(chord, 0.0) + duration
            
            if overlaps:
                dominant_chord = max(overlaps, key=overlaps.get)
                beat_chords.append(dominant_chord)
            else:
                beat_chords.append("𝄾")
            
        # 7. Agrupar en compases de 4/4
        compases = []
        measure_idx = 1
        
        for i in range(0, len(beat_chords), 4):
            measure_beats = []
            for j in range(4):
                idx = i + j
                if idx < len(beat_chords):
                    measure_beats.append(beat_chords[idx])
                else:
                    measure_beats.append("𝄾")
            
            compases.append({
                "id": measure_idx,
                "seccion": "Tema",
                "acordes": measure_beats
            })
            measure_idx += 1
            
        # 8. Transcribir y Alinear Letra de Voz si vocals_wav_path existe
        if vocals_wav_path and os.path.exists(vocals_wav_path):
            print("PYTHON: [ASR] Iniciando transcripción de letras offline...", file=sys.stderr)
            lyric_segments = transcribe_vocals(vocals_wav_path)
            
            # Alinear cada segmento de letra con el compás más cercano según su timestamp
            for seg in lyric_segments:
                start_time = seg["start"]
                if len(beat_times) > 0:
                    # Encontrar el beat index más cercano al start_time
                    closest_beat_idx = np.argmin(np.abs(beat_times - start_time))
                    # Calcular el ID del compás (1-based, agrupando por 4 beats)
                    measure_id = int(closest_beat_idx / 4) + 1
                    
                    # Asignar la letra al primer compás correspondiente
                    for compas in compases:
                        if compas["id"] == measure_id:
                            compas["lyric"] = seg["text"]
                            break

        # 9. Limpieza final de archivos de Demucs
        try:
            if os.path.exists(separated_dir):
                shutil.rmtree(separated_dir)
        except Exception as err:
            print(f"PYTHON: [WARNING] Error al limpiar directorio de Demucs: {err}", file=sys.stderr)

        print("PYTHON: Transcripción completada con éxito.", file=sys.stderr)
        return {
            "status": "success",
            "bpm": bpm_val,
            "compases": compases
        }
        
    except Exception as e:
        print(f"PYTHON: [ERROR] {e}", file=sys.stderr)
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stdout.flush()
        sys.stderr.flush()
        os.dup2(real_stdout_fd, 1)
        print(json.dumps({"status": "error", "message": "Falta el archivo de audio de entrada."}))
        sys.stdout.flush()
        os._exit(1)
        
    audio_file = sys.argv[1]
    if not os.path.exists(audio_file):
        sys.stdout.flush()
        sys.stderr.flush()
        os.dup2(real_stdout_fd, 1)
        print(json.dumps({"status": "error", "message": f"El archivo de audio {audio_file} no existe."}))
        sys.stdout.flush()
        os._exit(1)
        
    res = transcribe_song(audio_file)
    sys.stdout.flush()
    sys.stderr.flush()
    os.dup2(real_stdout_fd, 1)
    print(json.dumps(res))
    sys.stdout.flush()
    os._exit(0)
