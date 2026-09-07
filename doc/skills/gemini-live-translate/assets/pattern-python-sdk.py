# assets/pattern-python-sdk.py
# Mönster C: Python med google-genai SDK

import asyncio
from google import genai
from google.genai import types

async def run_live_translate(
    target_language: str = "sv",
    echo_target: bool = False,
    audio_stream_callback = None,
    text_transcript_callback = None
):
    client = genai.Client()

    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        translation_config=types.TranslationConfig(
            target_language_code=target_language,
            echo_target_language=echo_target
        )
    )

    async with client.aio.live.connect(
        model="gemini-3.5-live-translate-preview",
        config=config
    ) as session:

        async def receive_loop():
            async for response in session.receive():
                server_content = response.server_content
                if not server_content:
                    continue

                if server_content.input_transcription and text_transcript_callback:
                    text_transcript_callback(server_content.input_transcription.text, "source")

                if server_content.output_transcription and text_transcript_callback:
                    text_transcript_callback(server_content.output_transcription.text, "target")

                if server_content.model_turn:
                    for part in server_content.model_turn.parts:
                        if part.inline_data and audio_stream_callback:
                            # 24kHz PCM bytes
                            audio_stream_callback(part.inline_data.data)

        asyncio.create_task(receive_loop())

        # Exempel: sänd 16kHz PCM chunks (~100ms)
        # while is_active:
        #     pcm_bytes = await microphone_source.read()
        #     await session.send(input={"data": pcm_bytes, "mime_type": "audio/pcm;rate=16000"})
