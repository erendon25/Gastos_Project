import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        VStack(spacing: 40) {
            Spacer()
            
            // Logo / Branding
            VStack(spacing: 16) {
                Image(systemName: "bolt.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 80, height: 80)
                    .foregroundColor(Color(hex: "fca311"))
                    .shadow(color: Color(hex: "fca311").opacity(0.4), radius: 20)
                
                Text("FLUX")
                    .font(.system(size: 48, weight: .black, design: .default))
                    .kerning(4)
                    .foregroundColor(.white)
                
                Text("Finanza Inteligente")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.gray)
                    .kerning(2)
                    .textCase(.uppercase)
            }
            
            Spacer()
            
            // Botón Face ID
            Button(action: {
                authViewModel.authenticateWithFaceID()
            }) {
                HStack(spacing: 16) {
                    Image(systemName: "faceid")
                        .font(.system(size: 24))
                    Text("Ingresar con Face ID")
                        .font(.headline)
                        .fontWeight(.heavy)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white)
                .foregroundColor(.black)
                .cornerRadius(16)
                .shadow(color: .white.opacity(0.1), radius: 10, y: 5)
            }
            .padding(.horizontal, 40)
            
            if !authViewModel.errorMessage.isEmpty {
                Text(authViewModel.errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            Spacer()
                .frame(height: 40)
        }
        .background(Color(hex: "0a0a0a").ignoresSafeArea())
    }
}

// Extensión pequeña para colores HEX
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
