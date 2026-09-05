# Novamail Mobile

Flutter client for Android and iOS. It connects only to the Novarise FastAPI
gateway; mailbox credentials are never used directly by Flutter's UI.

## Development

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

## Production Android

```powershell
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.novarisesa.com/api/v1
flutter build apk --release --dart-define=API_BASE_URL=https://api.novarisesa.com/api/v1
```

## Production iOS

On a macOS runner with the Novarise Apple Developer team selected:

```bash
flutter build ipa --release --dart-define=API_BASE_URL=https://api.novarisesa.com/api/v1
```

No Firebase package or configuration is used.
