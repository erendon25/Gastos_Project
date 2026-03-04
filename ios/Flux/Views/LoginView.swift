import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    @State private var email = ""
    @State private var password = ""
    @State private var isLoginMode = true
    
    var body: some View {
        ScrollView {
            VStack(spacing: 30) {
                
                // Espacio superior
                Spacer().frame(height: 60)
                
                // Logo / Branding
                VStack(spacing: 12) {
                    Image(systemName: "bolt.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 70, height: 70)
                        .foregroundColor(Color(hex: "fca311"))
                        .shadow(color: Color(hex: "fca311").opacity(0.4), radius: 20)
                    
                    Text("FLUX")
                        .font(.system(size: 42, weight: .black, design: .default))
                        .kerning(4)
                        .foregroundColor(.white)
                    
                    Text(isLoginMode ? "Iniciar Sesión" : "Crear Cuenta")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.gray)
                }
                
                // Formulario de Email y Contraseña
                VStack(spacing: 16) {
                    // Campo Email
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Correo Electrónico")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        TextField("tu@correo.com", text: $email)
                            .padding()
                            .background(Color(hex: "1a1a1a"))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                    }
                    
                    // Campo Contraseña
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Contraseña")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        SecureField("••••••••", text: $password)
                            .padding()
                            .background(Color(hex: "1a1a1a"))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                    }
                    
                    // Botón Principal (Login o Registro)
                    Button(action: {
                        if !email.isEmpty && !password.isEmpty {
                            if isLoginMode {
                                authViewModel.loginWithEmail(email: email, pass: password)
                            } else {
                                authViewModel.registerWithEmail(email: email, pass: password)
                            }
                        }
                    }) {
                        Text(isLoginMode ? "Ingresar" : "Registrarse")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(hex: "fca311"))
                            .cornerRadius(12)
                            .shadow(color: Color(hex: "fca311").opacity(0.4), radius: 10, y: 5)
                            .opacity((email.isEmpty || password.isEmpty) ? 0.5 : 1)
                    }
                    .disabled(email.isEmpty || password.isEmpty)
                    .padding(.top, 10)
                    
                    // Alternar modo Login / Registro
                    Button(action: {
                        withAnimation {
                            isLoginMode.toggle()
                        }
                    }) {
                        Text(isLoginMode ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión")
                            .font(.footnote)
                            .fontWeight(.medium)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                .padding(.horizontal, 30)
                
                // Inicios de sesión alternativos (Redes Sociales y Biometría)
                if isLoginMode {
                    VStack(spacing: 20) {
                        HStack {
                            Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                            Text("o continúa con")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                        }
                        .padding(.horizontal, 30)
                        
                        // Botones de Redes Sociales
                        HStack(spacing: 16) {
                            // Botón de Google
                            Button(action: {
                                authViewModel.loginWithGoogle()
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "g.circle.fill") // Placeholder icon
                                        .font(.system(size: 20))
                                    Text("Google")
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .foregroundColor(.white)
                                .cornerRadius(12)
                            }
                            
                            // Botón de Apple
                            Button(action: {
                                authViewModel.loginWithApple()
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "applelogo")
                                        .font(.system(size: 20))
                                    Text("Apple")
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .foregroundColor(.white)
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal, 30)
                        
                        // Botón Face ID Secundario abajo
                        Button(action: {
                            authViewModel.authenticateWithFaceID()
                        }) {
                            HStack(spacing: 12) {
                                Image(systemName: "faceid")
                                    .font(.system(size: 20))
                                Text("Inicia con Face ID")
                                    .font(.subheadline)
                                    .fontWeight(.bold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .foregroundColor(Color(hex: "fca311"))
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "fca311").opacity(0.5), lineWidth: 1))
                        }
                        .padding(.horizontal, 30)
                    }
                }
                
                // Mensajes de error en caso de fallar Face ID o Formulario
                if !authViewModel.errorMessage.isEmpty {
                    Text(authViewModel.errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                
                Spacer()
            }
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
