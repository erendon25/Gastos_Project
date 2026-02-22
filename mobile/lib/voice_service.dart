import 'package:speech_to_text/speech_to_text.dart' as stt;

class VoiceService {
  final stt.SpeechToText _speech = stt.SpeechToText();

  Future<bool> init() async {
    return await _speech.initialize();
  }

  void startListening(Function(String) onResult) {
    _speech.listen(onResult: (val) => onResult(val.recognizedWords));
  }

  void stopListening() {
    _speech.stop();
  }

  bool get isListening => _speech.isListening;

  // Simple parser logic for the command
  Map<String, dynamic>? parseCommand(String text) {
    text = text.toLowerCase();
    if (text.contains('gasto de') || text.contains('gasté')) {
      final regExp = RegExp(r'\d+');
      final match = regExp.firstMatch(text);
      if (match != null) {
        final amount = double.parse(match.group(0)!);
        String category = 'otros';
        if (text.contains('supermercado')) category = 'alimentación';
        if (text.contains('transporte') || text.contains('uber')) category = 'transporte';
        
        return {
          'amount': amount,
          'category': category,
          'description': text,
          'date': DateTime.now()
        };
      }
    }
    return null;
  }
}
