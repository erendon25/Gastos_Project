import SwiftUI

struct TransactionsListView: View {
    let title: String
    let subtitle: String
    @StateObject var viewModel = TransactionViewModel()
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "0a0a0a").ignoresSafeArea()
                
                VStack(alignment: .leading, spacing: 0) {
                    
                    // Cabecera de la sección
                    VStack(alignment: .leading, spacing: 6) {
                        Text(title)
                            .font(.system(size: 32, weight: .heavy))
                            .foregroundColor(.white)
                        
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 20)
                    .padding(.bottom, 16)
                    
                    // Selector de Mes
                    HStack {
                        Button(action: {}) {
                            Image(systemName: "chevron.left")
                                .foregroundColor(.white)
                        }
                        Spacer()
                        HStack(spacing: 8) {
                            Image(systemName: "calendar")
                                .foregroundColor(Color(hex: "818cf8"))
                            Text("Marzo 2026")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        }
                        Spacer()
                        Button(action: {}) {
                            Image(systemName: "chevron.right")
                                .foregroundColor(.white)
                        }
                    }
                    .padding()
                    .background(Color(hex: "161616"))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.05), lineWidth: 1)
                    )
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                    
                    // Lista de Transacciones
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.transactions) { transaction in
                                TransactionRowView(transaction: transaction)
                            }
                        }
                        .padding(.horizontal, 20)
                        // Espacio al final para el Dock
                        .padding(.bottom, 120)
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }
}

struct TransactionRowView: View {
    let transaction: Models.Transaction
    
    var body: some View {
        HStack(spacing: 16) {
            // Icono de Categoría
            ZStack {
                Circle()
                    .fill(Color(hex: "222222"))
                    .frame(width: 50, height: 50)
                
                Text(transaction.icon)
                    .font(.system(size: 24))
            }
            
            // Detalles
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(transaction.category)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            // Monto
            VStack(alignment: .trailing, spacing: 4) {
                Text(transaction.type == .expense ? "-S/ \(String(format: "%.2f", transaction.amount))" : "+S/ \(String(format: "%.2f", transaction.amount))")
                    .font(.headline)
                    .fontWeight(.heavy)
                    .foregroundColor(transaction.type == .expense ? Color(hex: "fca311") : .green)
                
                Text("Hoy")
                    .font(.caption2)
                    .foregroundColor(Color.gray.opacity(0.7))
            }
        }
        .padding()
        .background(Color(hex: "161616"))
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.2), radius: 5, y: 2)
    }
}
