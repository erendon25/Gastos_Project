import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import 'voice_service.dart';

void main() {
  runApp(const GastosApp());
}

class GastosApp extends StatelessWidget {
  const GastosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0A0A0A),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;
  final VoiceService _voiceService = VoiceService();
  String _lastWords = '';

  @override
  void initState() {
    super.initState();
    _voiceService.init();
  }

  void _listen() {
    if (!_voiceService.isListening) {
      _voiceService.startListening((val) {
        setState(() {
          _lastWords = val;
          final command = _voiceService.parseCommand(val);
          if (command != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: const Color(0xFF1E1E1E),
                content: Text(
                  'Gasto agregado: S/ ${command['amount']} en ${command['category']}',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            );
          }
        });
      });
    } else {
      _voiceService.stopListening();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                const SizedBox(height: 20),
                _buildHeader(),
                const SizedBox(height: 30),
                if (_lastWords.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Text(
                      'Voz: "$_lastWords"',
                      style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey),
                    ),
                  ),
                _buildMainBalance(),
                const SizedBox(height: 30),
                _buildSummaryCards(),
                const SizedBox(height: 24),
                _buildStatsRow(),
                const SizedBox(height: 32),
                const Text('Gastos Recientes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildRecentTransactions(),
                const SizedBox(height: 32),
                const Text('Tendencia', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildChart(),
                const SizedBox(height: 32),
                _buildDetailedDebtProgress(),
                const SizedBox(height: 120),
              ],
            ),
          ),
          
          Positioned(
            bottom: 100,
            right: 24,
            child: FloatingActionButton(
              onPressed: _listen,
              backgroundColor: Colors.white,
              elevation: 10,
              child: Icon(
                _voiceService.isListening ? Icons.mic : Icons.add, 
                color: Colors.black, 
                size: 32
              ),
            ),
          ),

          Positioned(
            bottom: 24, left: 20, right: 20,
            child: CustomDock(
              selectedIndex: _selectedIndex,
              onTap: (index) => setState(() => _selectedIndex = index),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('Febrero 2026', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        CircleAvatar(radius: 16, backgroundColor: Colors.grey[900]),
      ],
    );
  }

  Widget _buildMainBalance() {
    return Column(
      children: const [
        Text('Lo que me queda', style: TextStyle(color: Colors.grey, fontSize: 14)),
        SizedBox(height: 8),
        Text('S/ 1,250.00', style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildSummaryCards() {
    return Row(
      children: [
        Expanded(child: _summaryCard('Ingresos', 'S/ 4,500.00', Colors.greenAccent)),
        const SizedBox(width: 12),
        Expanded(child: _summaryCard('Gastos', 'S/ 3,250.00', Colors.redAccent)),
      ],
    );
  }

  Widget _summaryCard(String title, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161616), 
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _statItem('12', 'Gastos'),
        _statItem('S/ 450', 'Ahorro'),
        _statItem('-8%', 'vs mes ant.', color: Colors.greenAccent),
      ],
    );
  }

  Widget _statItem(String value, String label, {Color? color}) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 10)),
      ],
    );
  }

  Widget _buildRecentTransactions() {
    return Column(
      children: const [
        TransactionItem(title: 'Supermercado', date: '22 Feb, 2026', amount: '- S/ 120.50'),
        SizedBox(height: 12),
        TransactionItem(title: 'Netflix', date: '20 Feb, 2026', amount: '- S/ 45.00'),
      ],
    );
  }

  Widget _buildChart() {
    return Container(
      height: 100, decoration: BoxDecoration(color: const Color(0xFF151515), borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.all(12),
      child: BarChart(BarChartData(
        gridData: FlGridData(show: false), titlesData: FlTitlesData(show: false), borderData: FlBorderData(show: false),
        barGroups: [
          BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 5, color: Colors.grey[800], width: 12)]),
          BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 8, color: Colors.grey[800], width: 12)]),
          BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 4, color: Colors.grey[800], width: 12)]),
          BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 10, color: Colors.white, width: 12)]),
        ],
      )),
    );
  }

  Widget _buildDetailedDebtProgress() {
    const double totalDebt = 7000;
    const double monthlyQuota = 350;
    const int paidQuotas = 2;
    const double paidAmount = monthlyQuota * paidQuotas;
    const double pendingAmount = totalDebt - paidAmount;
    const double progress = paidAmount / totalDebt;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1A), 
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Préstamo Banco', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('Inició: 3 de Enero, 2026', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: const [
                  Text('Faltan: S/ $pendingAmount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  Text('$paidQuotas cuotas pagadas', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          LinearProgressIndicator(
            value: progress, 
            backgroundColor: Colors.grey[800], 
            color: Colors.white, 
            minHeight: 8, 
            borderRadius: BorderRadius.circular(4)
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _debtSmallInfo('Cuota Mensual', 'S/ $monthlyQuota'),
              ),
              Container(width: 1, height: 24, color: Colors.white10),
              Expanded(
                child: _debtSmallInfo('Monto Total', 'S/ $totalDebt'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _debtSmallInfo(String label, String value) {
    return Column(
      children: [
        Text(label.toUpperCase(), style: const TextStyle(color: Colors.grey, fontSize: 10)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class TransactionItem extends StatelessWidget {
  final String title;
  final String date;
  final String amount;
  const TransactionItem({super.key, required this.title, required this.date, required this.amount});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white05)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 14)),
            Text(date, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          ]),
          Text(amount, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class CustomDock extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onTap;
  const CustomDock({super.key, required this.selectedIndex, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 72, 
      decoration: BoxDecoration(
        color: const Color(0xDD1A1A1A), 
        borderRadius: BorderRadius.circular(36), 
        border: Border.all(color: Colors.white10),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _navItem(0, Icons.home_rounded, 'Inicio'),
          _navItem(1, Icons.account_balance_wallet_rounded, 'Gastos'),
          _navItem(2, Icons.trending_up_rounded, 'Ingresos'),
          _navItem(3, Icons.analytics_rounded, 'Análisis'),
        ],
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label) {
    final bool isSelected = selectedIndex == index;
    return GestureDetector(
      onTap: () => onTap(index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white.withOpacity(0.05) : Colors.transparent, 
          borderRadius: BorderRadius.circular(20)
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: isSelected ? Colors.white : Colors.white60, size: 20),
          Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.white60, fontSize: 10)),
        ]),
      ),
    );
  }
}
