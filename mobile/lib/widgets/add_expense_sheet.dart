import 'package:flutter/material.dart';
import '../services/firebase_service.dart';

class AddExpenseSheet extends StatefulWidget {
  final Map<String, dynamic>? initialDraft;
  final Function(Map<String, dynamic>?) onUpdateDraft;

  const AddExpenseSheet({
    super.key,
    this.initialDraft,
    required this.onUpdateDraft,
  });

  @override
  State<AddExpenseSheet> createState() => _AddExpenseSheetState();
}

class _AddExpenseSheetState extends State<AddExpenseSheet> {
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _selectedCategory = 'Alimentación';
  final FirebaseService _firebaseService = FirebaseService();

  @override
  void initState() {
    super.initState();
    if (widget.initialDraft != null) {
      _amountController.text = widget.initialDraft!['amount']?.toString() ?? '';
      _descriptionController.text = widget.initialDraft!['description'] ?? '';
      _selectedCategory = widget.initialDraft!['category'] ?? 'Alimentación';
    }
  }

  void _saveDraft() {
    widget.onUpdateDraft({
      'amount': double.tryParse(_amountController.text) ?? 0.0,
      'description': _descriptionController.text,
      'category': _selectedCategory,
    });
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text);
    if (amount == null || _descriptionController.text.isEmpty) return;

    await _firebaseService.addExpense({
      'amount': amount,
      'description': _descriptionController.text,
      'category': _selectedCategory,
    });

    widget.onUpdateDraft(null);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        top: 12,
        left: 24,
        right: 24,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF1C1C1E),
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(color: Colors.grey[800], borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 24),
          const Text('Nuevo Registro', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(hintText: '0.00', border: InputBorder.none),
            onChanged: (_) => _saveDraft(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _descriptionController,
            decoration: InputDecoration(
              hintText: '¿En qué gastaste?',
              filled: true,
              fillColor: Colors.black,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
            onChanged: (_) => _saveDraft(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Confirmar Registro', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
