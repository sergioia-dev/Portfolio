# Technical Specification: Authentication & Authorization

## 1. Overview
Portfolio  will use a **Stateless Authentication** architecture utilizing **JSON Web Tokens (JWT)**. The system will not maintain session state on the server. Instead, the server will issue a cryptographically signed token upon successful login. The client will attach this token to subsequent requests, and the server will trust the token's contents to identify the user and authorize actions.

## 2. Core Concepts
*   **User:** Identified by a unique email and password.
*   **Role:** A job function or category assigned to a user (e.g., `ADMIN`, `AUTHOR`, `VISITOR`).
*   **Functionality (Permission):** A specific, granular action a user can perform (e.g., `CREATE_BLOG`, `APPROVE_BLOG`, `EDIT_SKILLS`).
*   **JWT (JSON Web Token):** A compact, URL-safe means of representing claims to be transferred between two parties.

## 3. The Data Model Relationship (RBAC)
Instead of assigning functionalities directly to users (which becomes unmanageable), we use **Role-Based Access Control (RBAC)**:
1.  A **User** is assigned one **Role**.
2.  A **Role** is a collection of **Functionalities**.
3.  When a user logs in, the system compiles their list of functionalities based on their Role and embeds them into the JWT.

## 4. Authentication Flow (Login)
1.  **Request:** The client sends a `POST /auth/login` request with `email` and `password`.
2.  **Validation:** The server validates the credentials against the database.
3.  **Token Generation:** If valid, the server generates a JWT.
4.  **Payload:** The token payload includes:
    *   `sub` (Subject): The User ID.
    *   `email`: The user's email.
    *   `role`: The user's role (e.g., `ADMIN`).
    *   `permissions`: An array of functionality strings (e.g., `["CREATE_BLOG", "APPROVE_BLOG"]`).
    *   `iat`: Issued at time.
    *   `exp`: Expiration time.
5.  **Response:** The server returns the JWT to the client.
6.  **Client Storage:** The client stores the JWT (typically in memory, a secure HttpOnly cookie, or LocalStorage depending on the security model).

## 5. Authorization Flow (Accessing Resources)
1.  **Request:** The client makes a request to a protected endpoint (e.g., `POST /api/blogs`) and includes the JWT in the `Authorization` header: `Bearer <token>`.
2.  **Verification:** The server verifies the token's signature to ensure it hasn't been tampered with.
3.  **Extraction:** The server decodes the token and reads the `permissions` array.
4.  **Check:** The server checks if the required functionality (e.g., `CREATE_BLOG`) exists in the user's permissions array.
    *   *If YES:* The request proceeds.
    *   *If NO:* The server returns a `403 Forbidden` response.

## 6. Handling the "Stateless" Challenge (Token Revocation)
Because the server does not store session data, a standard JWT cannot be easily "logged out" or revoked once issued. To handle this securely:
*   **Short Expiration:** JWTs will have a short lifespan (e.g., 15 minutes).
*   **Refresh Tokens:** The system will issue a long-lived Refresh Token (stored securely) that allows the client to get a new JWT without re-entering credentials.
*   **Permission Updates:** If an Admin changes a user's Role (e.g., removing `APPROVE_BLOG`), the user will retain their old permissions until their current short-lived JWT expires and a new one is issued.
* **All of this tokens must be saved  in a HttpOnly cookie**

## 7. Security Constraints
*   Passwords must be hashed using a strong algorithm (e.g., Argon2 or BCrypt).
*   JWT Secret keys must be strong and stored securely as environment variables.
* The authentication/authorization flow must have a reusable function to check if the user have the required permissions to a specify functionality.
*   The frontend must only use the JWT to conditionally render UI (e.g., hiding the "Approve Blog" button). **True authorization must always happen 
