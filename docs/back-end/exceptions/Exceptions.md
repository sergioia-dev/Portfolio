# Exceptions Module

This module defines the error messages returned when an error occurs.

* MSG-1
    * Username is already taken.
    * El nombre de usuario ya está en uso.

* MSG-2
    * Email address is already registered.
    * El correo electrónico ya está registrado.

* MSG-3
    * Invalid password. It must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@ ! & - _).
    * La contraseña no es válida. Debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@ ! & - _).

* MSG-4
    * User not found
    * Usuario no encontrado

* INVALID_USERNAME
    * Invalid username. It must be at most 39 characters of letters, numbers and single hyphens.
    * Nombre de usuario no válido. Debe tener como máximo 39 caracteres de letras, números y guiones simples.

* INVALID_EMAIL
    * Invalid email. It must be a valid address of at most 320 characters.
    * Correo electrónico no válido. Debe ser una dirección válida de como máximo 320 caracteres.

* UNAUTHORIZED
    * Unauthorized
    * No autorizado

* MSG-5
    * You do not have permission to create portfolio experiences (missing feature PORTFOLIO_CREATE).
    * No tienes permiso para crear experiencias de portafolio (falta la funcionalidad PORTFOLIO_CREATE).

* MSG-6
    * The specified language does not exist.
    * El idioma especificado no existe.

* MSG-7
    * The same language is repeated in the experiences list. Each language may appear only once.
    * El mismo idioma está repetido en la lista de experiencias. Cada idioma puede aparecer solo una vez.

* MSG-8
    * At least one experience entry is required.
    * Se requiere al menos una entrada de experiencia.

* MSG-9
    * The end date cannot be earlier than the start date.
    * La fecha de fin no puede ser anterior a la fecha de inicio.

* INVALID_URL
    * Invalid URL. It must be a valid absolute URL.
    * URL no válida. Debe ser una URL absoluta válida.

* INVALID_DATE_FORMAT
    * Invalid date. It must follow the format YYYY-MM-DD and be a real calendar date.
    * Fecha no válida. Debe seguir el formato AAAA-MM-DD y ser una fecha real del calendario.

* MISSING_FIELD
    * A required field is missing or empty.
    * Falta un campo obligatorio o está vacío.

* INVALID_TITLE
    * Invalid title.
    * Título no válido.

* INVALID_DESCRIPTION
    * Invalid description.
    * Descripción no válida.

* MSG-10
    * Experience not found.
    * Experiencia no encontrada.

* MSG-11
    * The experience was modified by another request. Reload and try again.
    * La experiencia fue modificada por otra solicitud. Recarga e inténtalo de nuevo.

* INVALID_ID
    * Invalid identifier. It must be a well-formed experience id.
    * Identificador no válido. Debe ser un id de experiencia con formato correcto.

* INVALID_QUERY_PARAM
    * Invalid query parameter.
    * Parámetro de consulta no válido.
