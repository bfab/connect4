const AES256 = (() => {
    // Helper functions
    function str2ab(str) {
      return new TextEncoder().encode(str);
    }
  
    function ab2str(buf) {
      return new TextDecoder().decode(buf);
    }
  
    function arrayBufferToBase64(buffer) {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }
  
    function base64ToArrayBuffer(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }
  
    // Derive key from password
    async function deriveKey(password, salt) {
      const baseKey = await crypto.subtle.importKey(
        "raw",
        str2ab(password),
        "PBKDF2",
        false,
        ["deriveKey"]
      );
  
      return crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }
  
    // Encrypt string
    async function encrypt(password, plaintext) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
  
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        str2ab(plaintext)
      );
  
      return `${arrayBufferToBase64(salt)}:${arrayBufferToBase64(iv)}:${arrayBufferToBase64(encrypted)}`;
    }
  
    // Decrypt string
    async function decrypt(password, encryptedString) {
      const [saltB64, ivB64, ciphertextB64] = encryptedString.split(":");
      const salt = base64ToArrayBuffer(saltB64);
      const iv = base64ToArrayBuffer(ivB64);
      const ciphertext = base64ToArrayBuffer(ciphertextB64);
  
      const key = await deriveKey(password, salt);
  
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        ciphertext
      );
  
      return ab2str(decrypted);
    }
  
    // Public API
    return {
      encrypt,
      decrypt
    };
  })();
  