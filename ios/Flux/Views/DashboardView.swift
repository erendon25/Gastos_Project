import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "0a0a0a").ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {
                        
                        // Header
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Resumen de Mes")
                                    .font(.system(size: 28, weight: .heavy))
                                    .foregroundColor(.white)
                                Text("Marzo 2026")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                            Button(action: {
                                authViewModel.logout()
                            }) {
                                Image(systemName: "person.circle.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 20)
                        
                        // Balance Premium Card
                        VStack(alignment: .leading, spacing: 12) {
                            Text("GASTADO")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.gray)
                            
                            HStack(alignment: .bottom) {
                                Text("S/")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                    .padding(.bottom, 2)
                                Text("1,240.50")
                                    .font(.system(size: 40, weight: .heavy))
                                    .foregroundColor(.white)
                            }
                            
                            // ProgressBar visual
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 10)
                                        .frame(height: 8)
                                        .foregroundColor(Color(hex: "222222"))
                                    RoundedRectangle(cornerRadius: 10)
                                        .frame(width: geometry.size.width * 0.4, height: 8)
                                        .foregroundColor(Color(hex: "fca311")) // Color premium
                                }
                            }
                            .frame(height: 8)
                            .padding(.top, 4)
                            
                            Text("Quedan S/ 2,400 libres")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 24)
                                .fill(Color(hex: "161616"))
                                .shadow(color: .white.opacity(0.02), radius: 10, y: 5)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 24)
                                        .stroke(Color.white.opacity(0.05), lineWidth: 1)
                                )
                        )
                        .padding(.horizontal)
                        
                        // Botón Flotante para Agregar Gasto (+)
                        Button(action: {
                            // Agregar nuevo gasto interface
                        }) {
                            HStack {
                                Image(systemName: "plus")
                                    .font(.headline)
                                Text("Agregar Gasto")
                                    .font(.headline)
                                    .fontWeight(.bold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.white)
                            .foregroundColor(.black)
                            .cornerRadius(16)
                            .padding(.horizontal)
                        }
                    }
                    .padding(.bottom, 100)
                }
            }
            .navigationBarHidden(true)
        }
    }
}

// Para la preview de SwiftUI en Xcode
struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
            .environmentObject(AuthViewModel())
    }
}
