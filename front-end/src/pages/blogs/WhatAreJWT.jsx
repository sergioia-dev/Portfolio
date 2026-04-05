import StaticAside from "../../components/StaticAside";
import "../../style/blog.css";

function WhatAreJWT({ language, handleLanguage, theme, handleTheme }) {
  const Section_ES = () => {
    return (
      <div className="section-area blog">
        <header>
          <h1>¿Qué son los JSON Web Tokens (JWT)?</h1>
          <span>5 de abril de 2026</span>
          <span>15 min de lectura</span>
        </header>

        <section>
          <p>
            Cuando construyes una aplicación que tiene que gestionar usuarios y
            sesiones, normalmente tienes que pensar cómo gestionar las sesiones
            de tus usuarios. Hay varias formas de gestionar las sesiones de tus
            usuarios, una de ellas es JWT o JSON Web Token.
          </p>
          <h2>¿Qué son los JWTs?</h2>
          <p>
            JWT o JSON Web Token es un método estandarizado para autenticación y
            autorización que se utiliza para transmitir información de forma
            segura entre dos partes—en este caso el usuario y el servidor. Se
            utiliza principalmente para verificar la identidad del usuario y
            controlar el acceso a recursos protegidos en aplicaciones y APIs.
          </p>
          <h2>¿Por qué usar JWT?</h2>
          <p>
            Hay varias razones por las que JWT es la opción preferida para los
            sistemas de autenticación modernos:
          </p>
          <ul>
            <li>
              <strong>Sin estado (Stateless):</strong> No se necesita
              almacenamiento de sesiones en la base de datos, el servidor valida
              el token solo con la clave secreta.
            </li>
            <li>
              <strong>Escalabilidad:</strong> Perfecto para microservicios y
              sistemas distribuidos que no requieren un almacén de sesiones
              compartido.
            </li>
            <li>
              <strong>Multi-dominio:</strong> Funciona perfectamente en
              diferentes dominios como aplicaciones mobiles y es ideal para
              escenarios de SSO.
            </li>
            <li>
              <strong>Compatible con móviles:</strong> Manejo simple de tokens
              en aplicaciones móviles.
            </li>
            <li>
              <strong>Estándar abierto:</strong> RFC 7519 que son bibliotecas
              ampliamente compatibles en cada lenguaje de programación.
            </li>
            <li>
              <strong>Rendimiento:</strong> Sin consultas a la base de datos por
              solicitud, solo se necesita verificar la firma.
            </li>
            <li>
              <strong>Descentralizado:</strong> Cada token es autónomo con toda
              la información del usuario necesaria.
            </li>
          </ul>
          <h2>¿Cómo se utiliza?</h2>
          <h3>Autenticación:</h3>
          <p>
            Los JWT se emiten después de un inicio de sesión exitoso para probar
            la identidad del usuario. El token contiene{" "}
            <strong>reclamaciones</strong> (por ejemplo, ID de usuario, rol).
            Estas son pares clave-valor que representan los datos del usuario.
            El servidor puede verificar estas reclamaciones sin consultar una
            base de datos.
          </p>
          <h3>Autorización:</h3>
          <p>
            Los JWT transportan permisos o roles, permitiendo que el servidor
            tome decisiones de control de acceso basadas en la carga útil del
            token.
          </p>
          <h3>Seguridad:</h3>
          <p>
            Los JWT están firmados digitalmente (usando HMAC o RSA) para
            garantizar la integridad de los datos y prevenir manipulaciones. La
            firma es validada por el servidor para confirmar la autenticidad del
            token.
          </p>
          <p>
            Aunque los JWT son un componente fundamental de los sistemas de
            autenticación segura, no son una solución de seguridad
            independiente. Deben utilizarse con mejores prácticas como HTTPS,
            gestión segura de claves, expiración del token y evitar datos
            sensibles en la carga útil para garantizar una seguridad robusta.
          </p>
          <h2>¿Cómo está compuesto?</h2>
          <p>
            Un JWT es una cadena única compuesta por tres partes codificadas en
            Base64Url separadas por puntos, cada una con un propósito
            específico. Generalmente se ve así:
          </p>
          <pre>
            {`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJyb2xlIjoidXNlciIsImV4cCI6MTc0Mjg1NDQwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`}
          </pre>
          <h3>Parte 1: Encabezado (Metadatos)</h3>
          <p>
            Esta parte contiene metadatos sobre el token, incluyendo el
            algoritmo utilizado para firmarlo.
          </p>
          <pre>
            {`{
  "alg": "HS256",
  "typ": "JWT"
}`}
          </pre>
          <h3>Parte 2: Carga útil (Los datos reales)</h3>
          <p>
            Esta parte contiene los datos reales (reclamaciones) codificados en
            el token. Algunas reclamaciones son estándar:
          </p>
          <ul>
            <li>
              <strong>sub</strong>: Sujeto (generalmente el ID del usuario)
            </li>
            <li>
              <strong>iat</strong>: Emitido En (marca de tiempo)
            </li>
            <li>
              <strong>exp</strong>: Tiempo de Expiración (marca de tiempo)
            </li>
          </ul>
          <pre>
            {`{
  "sub": "123",
  "email": "user@mail.com",
  "roles": ["user", "editor"],
  "iat": 1742850800,
  "exp": 1742854400
}`}
          </pre>
          <h3>Parte 3: Firma (Sellado a prueba de manipulaciones)</h3>
          <p>
            Esta parte se crea codificando el encabezado y la carga útil,
            combinándolos con una clave secreta y realizándoles un hash. El
            resultado se añade al final del token.
          </p>
          <pre className="code-block">
            {`firma = HMAC-SHA256(
  base64UrlEncode(encabezado) + "." + base64UrlEncode(cargaUtil),
  claveSecreta
)`}
          </pre>
          <p>
            Después de añadir todas las partes obtenemos el JSON Web Token que
            nuestra aplicación debería guardar de forma segura cada vez que la
            aplicación quiera hacer una transacción con el backend, ese token se
            utilizará para verificar la identidad del usuario.
          </p>
        </section>
        <section>
          <h2>¿Cómo funciona?</h2>
          <p>
            <strong>La codificación Base64Url</strong> no es cifrado es solo una
            forma de codificar datos binarios como texto. Cualquiera puede
            decodificar el encabezado y la carga útil (están codificados en
            base64), pero no puede modificarlos sin romper la firma.
          </p>
          <ul>
            <li>
              <strong>Los datos son legibles: </strong>
              Cualquiera puede decodificar el encabezado y la carga útil (están
              solo codificados en base64)
            </li>
            <li>
              <strong>Los datos son a prueba de manipulaciones: </strong>
              Cualquier cambio al encabezado o carga útil rompe la firma
            </li>
            <li>
              <strong>La clave nunca sale del servidor: </strong>
              La clave secreta se usa solo para crear/verificar la firma, nunca
              se transmite.
            </li>
            <li>
              <strong>Verificación: </strong>
              El servidor vuelve a hacer hash del encabezado + carga útil con la
              clave secreta y compara con la firma
            </li>
          </ul>
          <h2>El Flujo de Autenticación</h2>
          <ol>
            <li>
              <strong>Inicio de sesión:</strong> El usuario envía credenciales
              al servidor
            </li>
            <li>
              <strong>Emisión del token:</strong> El servidor valida las
              credenciales y emite un JWT firmado con una clave secreta
            </li>
            <li>
              <strong>Almacenamiento:</strong> El cliente almacena el token de
              forma segura
            </li>
            <li>
              <strong>Solicitudes:</strong> El cliente incluye el JWT en la
              cabecera Authorization para cada solicitud
            </li>
            <li>
              <strong>Verificación:</strong> El servidor valida la firma y
              extrae la información del usuario de las reclamaciones
            </li>
          </ol>
          <h2>Prácticas Comunes</h2>
          <h3>Almacenamiento del Token</h3>
          <h4>Aplicaciones web</h4>
          <p>Los tokens pueden almacenarse en: </p>
          <ul>
            <li>
              <strong>localStorage</strong>
              (accesible por JavaScript, vulnerable a XSS).
            </li>
            <li>
              <strong>cookies httpOnly</strong>
              (no accesibles por JavaScript, protegidas de XSS pero vulnerables
              a CSRF)
            </li>
          </ul>
          <h4>Aplicaciones móviles</h4>
          En aplicaciones móviles depende de la plataforma en la que estemos
          trabajando, pero estas son las formas comunes:
          <ul>
            <li>
              <strong>IOS: </strong>
              iOS Keychain
            </li>
            <li>
              <strong>Android: </strong>Android Keystore usando
              EncryptedSharedPreferences
            </li>
            <li>
              <strong>Cross-platform como React Native y Flutter: </strong>
              Usa un wrapper de almacenamiento seguro como react-native-keychain
              o flutter_secure_storage.
            </li>
          </ul>
          <h3>Expiración del Token</h3>
          <p>
            Los JWT deben tener un tiempo de expiración corto, generalmente de
            15 minutos a 1 hora. Para sesiones de larga duración, la mayoría de
            los proyectos usualmente usan{" "}
            <strong> tokens de actualización </strong>
            para obtener nuevos tokens de acceso sin volver a autenticar.
          </p>
        </section>
        <section></section>

        <footer>
          <p>
            Esta es solo una breve explicación de qué son los JSON Web Tokens.
            Puedes encontrar más información aquí:
          </p>
          <div className="footer-links">
            <a
              href="https://www.geeksforgeeks.org/web-tech/json-web-token-jwt/"
              target="_blank"
            >
              GeeksforGeeks - JSON Web Token
            </a>
            <a
              href="https://www.youtube.com/watch?v=7ozQLeFJpqs"
              target="_blank"
            >
              JWT Explained in 2 minutes (Video)
            </a>
          </div>
        </footer>
      </div>
    );
  };

  const Section_EN = () => {
    return (
      <div className="section-area blog">
        <header>
          <h1>What are JSON Web Tokens (JWT)?</h1>
          <span>April 5, 2026 </span>
          <span>15 min read</span>
        </header>

        <section>
          <p>
            When you are building an application that has to manage users and
            sessions you usually have to think how would you manage the sessions
            of your users, there are several ways to manage the session of your
            users, one of them is JWT or JSON Web Token.
          </p>
          <h2>What are JWTs?</h2>
          <p>
            JWT or JSON Web Token is a standardized method for authentication
            and authorization that is used to securely transmit information
            between two parties, in this case the user and the server. It is
            primarily used to verify user identity and control access to
            protected resources in applications and APIs.
          </p>
          <h2>Why Use JWT?</h2>
          <p>
            Several reasons make JWT the preferred choice for modern
            authentication systems:
          </p>
          <ul>
            <li>
              <strong>Stateless:</strong> No database session storage needed,
              the server validates the token with just the secret key.
            </li>
            <li>
              <strong>Scalability:</strong> Perfect for microservices and
              distributed systems which ones not required shared session store.
            </li>
            <li>
              <strong>Cross-domain:</strong> Works seamlessly across different
              domains, ideal for SSO scenarios.
            </li>
            <li>
              <strong>Mobile-friendly:</strong> Simple token handling in mobile
              applications.
            </li>
            <li>
              <strong>Open standard:</strong> RFC 7519 a widely supported
              libraries in every programming language
            </li>
            <li>
              <strong>Performance:</strong> No database queries per request,
              just verify the signature.
            </li>
            <li>
              <strong>Decentralized:</strong> Each token is self-contained with
              all user information needed.
            </li>
          </ul>
          <h2>How is it Used?</h2>
          <h3>Authentication:</h3>
          <p>
            JWTs are issued after successful login to prove a user's identity.
            The token contains <strong>claims</strong> (e.g., user ID, role).
            These are key-value pairs that represent user data. The server can
            verify these claims without querying a database.
          </p>
          <h3>Authorization:</h3>
          <p>
            JWTs carry permissions or roles, allowing the server to make access
            control decisions based on the token's payload.
          </p>
          <h3>Security:</h3>
          <p>
            JWTs are digitally signed (using HMAC or RSA) to ensure data
            integrity and prevent tampering. The signature is validated by the
            server to confirm the token's authenticity.
          </p>
          <p>
            While JWTs are a core component of secure authentication systems,
            they are not a standalone security solution. They must be used with
            best practices like HTTPS, secure key management, token expiration,
            and avoiding sensitive data in the payload to ensure robust
            security.
          </p>
          <h2>How Is It Composed?</h2>
          <p>
            A JWT is a single string composed of three Base64Url-encoded parts
            separated by dots, each of which has a specific purpose. It usually
            looks like this:
          </p>
          <pre>
            {`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJyb2xlIjoidXNlciIsImV4cCI6MTc0Mjg1NDQwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`}
          </pre>
          <h3>Part 1: Header (Metadata)</h3>
          <p>
            This part contains metadata about the token, including the algorithm
            used to sign it.
          </p>
          <pre>
            {`{
  "alg": "HS256",
  "typ": "JWT"
}`}
          </pre>
          <h3>Part 2: Payload (The Actual Data)</h3>
          <p>
            This part contains the actual data (claims) encoded in the token.
            Some claims are standard:
          </p>
          <ul>
            <li>
              <strong>sub</strong>: Subject (usually the user ID)
            </li>
            <li>
              <strong>iat</strong>: Issued At (timestamp)
            </li>
            <li>
              <strong>exp</strong>: Expiration Time (timestamp)
            </li>
          </ul>
          <pre>
            {`{
  "sub": "123",
  "email": "user@mail.com",
  "roles": ["user", "editor"],
  "iat": 1742850800,
  "exp": 1742854400
}`}
          </pre>
          <h3>Part 3: Signature (Tamper-Proof Seal)</h3>
          <p>
            This part is created by encoding the header and payload, combining
            them with a secret key, and hashing them. The result is appended at
            the end of the token.
          </p>
          <pre className="code-block">
            {`signature = HMAC-SHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secretKey
)`}
          </pre>
          <p>
            After appending all the parts we get the JSON Web Token which our
            app should save securely—every time the app wants to make a
            transaction with the backend, that token will be used to verify the
            user's identity.
          </p>
        </section>
        <section>
          <h2>How it Works?</h2>
          <p>
            <strong>Base64Url encoding</strong> is not encryption—it's just a
            way to encode binary data as text. Anyone can decode the header and
            payload (they're just base64 encoded), but they cannot modify them
            without breaking the signature.
          </p>
          <ul>
            <li>
              <strong>Data is readable: </strong>
              Anyone can decode header and payload (they're just base64 encoded)
            </li>
            <li>
              <strong>Data is tamper-proof: </strong>
              Any change to header/payload breaks the signature
            </li>
            <li>
              <strong>Secret never leaves the server: </strong>
              Secret key used only to create/verify signature, never
              transmitted.
            </li>
            <li>
              <strong>Verification: </strong>
              Server re-hashes header+payload with secret and compares to
              signature
            </li>
          </ul>
          <h2>The Authentication Flow</h2>
          <ol>
            <li>
              <strong>Login:</strong> User submits credentials to the server
            </li>
            <li>
              <strong>Token Issuance:</strong> Server validates credentials and
              issues a JWT signed with a secret key
            </li>
            <li>
              <strong>Storage:</strong> Client stores the token securely
            </li>
            <li>
              <strong>Requests:</strong> Client includes the JWT in the
              Authorization header for each request
            </li>
            <li>
              <strong>Verification:</strong> Server validates the signature and
              extracts user info from claims
            </li>
          </ol>
          <h2>Common Practices</h2>
          <h3>Token Storage</h3>
          <h4>Web applications</h4>
          <p>Tokens can be stored in: </p>
          <ul>
            <li>
              <strong>localStorage</strong>
              (accessible by JavaScript, vulnerable to XSS).
            </li>
            <li>
              <strong>httpOnly cookies</strong>
              (not accessible by JavaScript, protected from XSS but vulnerable
              to CSRF)
            </li>
          </ul>
          <h4>Mobile applications</h4>
          In mobile applications it depends of the platform in which we are
          working but these are the common ways:
          <ul>
            <li>
              <strong>IOS: </strong>
              iOS Keychain
            </li>
            <li>
              <strong>Android: </strong>Android Keystore using
              EncryptedSharedPreferences
            </li>
            <li>
              <strong>Cross-platform like React Native and Flutter: </strong>
              Use a secure storage wrapper like react-native-keychain or
              flutter_secure_storage.
            </li>
          </ul>
          <h3>Token Expiration</h3>
          <p>
            JWTs should have a short expiration time from usually 15 minutes to
            1 hour. For long-lived sessions, most projects usually use
            <strong> refresh tokens </strong>
            to obtain new access tokens without re-authenticating.
          </p>
        </section>
        <section></section>

        <footer>
          <p>
            This is just a short explanation of what JSON Web Tokens are. You
            can find more information about this here:
          </p>
          <div className="footer-links">
            <a
              href="https://www.geeksforgeeks.org/web-tech/json-web-token-jwt/"
              target="_blank"
            >
              GeeksforGeeks - JSON Web Token
            </a>
            <a
              href="https://www.youtube.com/watch?v=7ozQLeFJpqs"
              target="_blank"
            >
              JWT Explained in 2 minutes (Video)
            </a>
          </div>
        </footer>
      </div>
    );
  };

  return (
    <article className={`grid-page ${theme}`}>
      <StaticAside
        language={language}
        handleLanguage={handleLanguage}
        theme={theme}
        handleTheme={handleTheme}
      />
      {language === "EN" ? <Section_EN /> : <Section_ES />}
    </article>
  );
}

export default WhatAreJWT;
