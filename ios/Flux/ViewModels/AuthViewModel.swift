import SwiftUI
import LocalAuthentication
import FirebaseAuth

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var errorMessage = ""
    @Published var isAuthenticating = false
    
    // Al arrancar, verifica si ya hay una sesión guardada en Firebase
    init() {
        if Auth.auth().currentUser != nil {
            self.isAuthenticated = true
        }
    }

    func authenticateWithFaceID() {
        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            let reason = "Inicia sesión en Flux para acceder a tus finanzas."
            self.isAuthenticating = true

            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authenticationError in
                DispatchQueue.main.async {
                    self.isAuthenticating = false
                    if success {
                        withAnimation {
                            self.isAuthenticated = true
                        }
                    } else {
                        self.errorMessage = "Error de autenticación: \(authenticationError?.localizedDescription ?? "")"
                    }
                }
            }
        } else {
            self.errorMessage = "Face ID / Touch ID no está disponible en este dispositivo."
            // Fallback: Permitir login por contraseña normal
        }
    }
    
    // Función REAL para iniciar con Firebase
    func loginWithEmail(email: String, pass: String) {
        self.isAuthenticating = true
        Auth.auth().signIn(withEmail: email, password: pass) { authResult, error in
            DispatchQueue.main.async {
                self.isAuthenticating = false
                if let error = error {
                    self.errorMessage = error.localizedDescription
                } else {
                    withAnimation { self.isAuthenticated = true }
                }
            }
        }
    }
    
    // Función REAL para registro con Firebase
    func registerWithEmail(email: String, pass: String) {
        self.isAuthenticating = true
        Auth.auth().createUser(withEmail: email, password: pass) { authResult, error in
            DispatchQueue.main.async {
                self.isAuthenticating = false
                if let error = error {
                    self.errorMessage = error.localizedDescription
                } else {
                    withAnimation { self.isAuthenticated = true }
                }
            }
        }
    }
    
    // Función para simular Login con Google
    func loginWithGoogle() {
        self.isAuthenticating = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            self.isAuthenticating = false
            withAnimation {
                self.isAuthenticated = true
            }
        }
    }
    
    // Función para simular Login con Apple
    func loginWithApple() {
        self.isAuthenticating = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            self.isAuthenticating = false
            withAnimation {
                self.isAuthenticated = true
            }
        }
    }
    
    func logout() {
        withAnimation {
            self.isAuthenticated = false
        }
    }
}
