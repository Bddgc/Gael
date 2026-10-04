# Privacy

Gael stores settings and game profiles locally, normally in `%APPDATA%/gael`. API keys are encrypted using Electron's Windows safeStorage. Do not share the application data folder.

AI chat sends submitted questions and relevant conversation context to OpenAI. Guide requests can include the saved game profile, progress, equipment, resources, and previous guide context and use provider web search. Microphone audio is recorded on request and sent for transcription when recording is completed. Review the transcript before sending a chat question. Cancel or close the panel to stop local recording and requests.

Assistant requests specify `store: false`. This does not override provider retention policies or guarantee that local cancellation stops provider processing or billing.

Game detection reads Windows process information and can look up Steam titles. League of Legends alerts use the local public live-client endpoint. Gael does not capture screenshots, inspect game memory, or inject code into games.

Delete this guide removes the selected local profile. New chat clears its conversation context while retaining preparation and progress. Do not attach API keys, private guides, or recordings to public issues.
