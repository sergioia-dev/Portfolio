import StaticAside from "../../components/StaticAside";
import "../../style/blog.css";

function WhatIsNix({ language, handleLanguage, theme, handleTheme }) {
  const Section_ES = () => {
    return (
      <div className="section-area blog">
        <header>
          <h1>¿Qué es Nix?</h1>
          <span>31 de enero de 2026</span>
          <span>15 min de lectura</span>
        </header>

        <section>
          <p>
            Si has estado en un viaje con Linux por un tiempo, probablemente
            hayas escuchado el nombre <strong>Nix</strong>. Es posible que lo
            hayas buscado, solo para encontrarte con conceptos que parecían
            confusos o densos. Si eso te suena familiar, no estás solo.
            Entonces, vamos a desglosarlo:
          </p>

          <h4>
            En su esencia, Nix es un ecosistema poderoso y único construido
            alrededor de un principio central: despliegue de software confiable
            y reproducible. Este ecosistema consiste principalmente en tres
            componentes interconectados:
          </h4>
          <ul>
            <li>
              <strong>Paquetes Nix:</strong> Este es el repositorio de software
              más grande del mundo y más actualizado, que cuenta con más de{" "}
              <strong>120,000 paquetes activos</strong>. Pero no se trata solo
              de cantidad. La magia está en cómo se construyen y gestionan estos
              paquetes, asegurando resultados consistentes en diferentes
              sistemas.
            </li>
            <li>
              <strong>El lenguaje Nix:</strong> Este es el pegamento que
              mantiene todo junto. Es un lenguaje de programación puramente
              funcional, evaluado perezosamente diseñado específicamente para{" "}
              configuración declarativa y definiciones de paquetes. En lugar de
              escribir instrucciones paso a paso (imperativas), declaras cómo
              quieres que se vea tu sistema o paquete, similar en espíritu a
              lenguajes como Haskell.
            </li>
            <li>
              <strong>NixOS:</strong> Aquí es donde el ecosistema se convierte
              en un sistema operativo completo. NixOS utiliza el lenguaje Nix y
              Nixpkgs para definir tu configuración de sistema completo en un
              único conjunto de archivos declarativos.
            </li>
          </ul>

          <p>
            Entonces, ¿cuál es el gran problema? La combinación de estas
            herramientas resuelve problemas críticos en la gestión de software:
            conflictos de dependencias, el síndrome de "funciona en mi máquina"
            y la dificultad de revertir cambios. Con Nix, puedes crear entornos
            aislados y reproducibles para desarrollo, asegurar que la
            configuración de tu sistema esté controlada por versiones y sea
            consistente, y compartir tu configuración con otros, sabiendo que
            funcionará exactamente de la misma manera.
          </p>
          <p>
            Pero, ¿cómo empezó todo? Bueno, comenzó como una tesis de Eelco
            Dolstra, donde buscaba un sistema que fuera realmente confiable,
            pudiendo controlar un despliegue completo.
          </p>
        </section>

        <section>
          <h3>Entendiendo los Modelos de Despliegue de Software</h3>
          <p>
            El despliegue de software fundamentalmente implica transferir un
            conjunto de archivos que constituyen un programa a un sistema de
            usuario final. Si bien esto puede parecer sencillo, el proceso está
            plagado de desafíos que pueden categorizarse en dos áreas
            principales: problemas ambientales y problemas de manejabilidad.
          </p>

          <h4>Problemas Ambientales</h4>
          <ul>
            <li>
              Los desafíos ambientales se refieren principalmente a las
              dependencias del software. Un programa puede depender de
              componentes de software específicos o requerir modificaciones
              particulares del sistema para funcionar correctamente. Si estas
              condiciones no se cumplen, o si difieren del entorno del
              desarrollador, el software puede fallar.
            </li>
            <li>
              Los sistemas operativos son inherentemente complejos y no
              deterministas. Es a menudo imposible garantizar la presencia de
              dependencias requeridas, ya que los componentes de software rara
              vez son autónomos y frecuentemente dependen de otros componentes.
              Este problema se ve exacerbado al empaquetar software, ya que las
              dependencias pueden volverse evidentes solo al desplegarse en una
              máquina diferente.
            </li>
            <li>
              Las dependencias no se limitan a componentes de tiempo de
              ejecución. Al desplegar desde el código fuente, las dependencias
              de tiempo de compilación como compiladores y bibliotecas son
              necesarias, sin embargo, estas rara vez se incluyen por defecto en
              la mayoría de los sistemas operativos.
            </li>
            <li>
              La compatibilidad de versiones complica aún más el despliegue. Las
              dependencias de software evolucionan, y las versiones más nuevas
              pueden introducir cambios disruptivos. Asegurar que las versiones
              correctas estén disponibles es crítico para la funcionalidad.
            </li>
            <li>
              Incluso si todas las dependencias requeridas están presentes, un
              componente debe poder localizarlas. Esto típicamente implica
              buscar rutas predefinidas, como CLASSPATH o directorios binarios,
              como es común en entornos Linux.
            </li>
          </ul>

          <p>
            Adicionalmente, algunos componentes pueden depender de artefactos no
            software, como archivos de configuración o cuentas de usuario,
            añadiendo otra capa de complejidad ambiental.
          </p>

          <h4>Problemas de Manejabilidad</h4>
          <p>La gestión de software introduce sus propios desafíos:</p>
          <ul>
            <li>
              <strong>Desinstalación:</strong> Eliminar un componente de forma
              segura requiere borrar archivos de configuración, eliminar
              entradas de rutas como CLASSPATH, y asegurar que ningún otro
              software dependa de las mismas dependencias. Fallar en hacerlo
              puede romper otras aplicaciones.
            </li>
            <li>
              <strong>Actualizaciones:</strong>
              La mayoría de los gestores de paquetes no soportan la instalación
              concurrente de múltiples versiones del mismo software. Las
              actualizaciones típicamente sobrescriben las versiones existentes
              sin verificar la compatibilidad con software dependiente, llevando
              a una potencial inestabilidad del sistema.
            </li>
          </ul>
          <p>
            Estos problemas contribuyen al escenario del "Infierno DLL", donde
            actualizar o desinstalar una aplicación interrumpe otras que
            comparten dependencias. Las especificaciones de dependencia en los
            gestores de paquetes tradicionales son inherentemente poco
            confiables, ya que dependen de identificadores nominales (nombres y
            rangos de versión) en lugar de referencias precisas e inmutables a
            artefactos. Esto permite que componentes funcionalmente
            incompatibles con identificadores de versión idénticos satisfagan
            las dependencias, socavando la integridad del sistema.
          </p>
        </section>
        <section>
          <h3>Gestión de Paquetes Tradicional</h3>
          <p>
            RPM (Red Hat Package Manager) es una herramienta de despliegue de
            bajo nivel ampliamente utilizada en distribuciones Linux. Instala y
            gestiona componentes mientras mantiene metadatos para prevenir
            actualizaciones o desinstalaciones inseguras. Por ejemplo, un
            paquete RPM se construye desde el código fuente usando:
          </p>
          <pre>
            <code>rpm build -ba hello.tar.gz</code>
          </pre>
          <p>
            El paquete resultante (por ejemplo: hello-1.0.i686.rpm) es
            transferido a máquinas cliente e instalado vía:
          </p>

          <pre>
            <code>rpm -i hello-1.0.i686.rpm</code>
          </pre>
          <p>
            RPM rastrea la propiedad de archivos, verifica la integridad de los
            archivos a través de hashes criptográficos y aplica restricciones de
            dependencia. Por ejemplo, si un paquete xhello depende de hello,
            desinstalar hello es bloqueado mientras xhello permanezca instalado.
          </p>
          <p>Sin embargo, RPM sufre de limitaciones fundamentales:</p>
          <ul>
            <li>
              <strong>Incapacidad para Validar Dependencias:</strong> Las
              especificaciones de dependencia (por ejemplo: Requires: hello) son
              nominales y basadas en nombres de componentes en lugar de
              propiedades funcionales. Esto hace imposible garantizar la
              corrección, ya que cualquier componente llamado hello,
              independientemente de su comportamiento real o versión, puede
              satisfacer el requisito.
            </li>
            <li>
              <strong>Inexactitud de Versionado:</strong> Si bien RPM soporta
              restricciones de versión (por ejemplo: Requires: hello &ge; 1.0),
              estas permanecen nominales y asumen compatibilidad hacia atrás, lo
              cual no puede ser garantizado. Incluso las dependencias "exactas"
              (por ejemplo: Requires: hello = 1.0) son poco confiables, ya que
              versiones parcheadas o compiladas de manera diferente pueden tener
              el mismo nombre y número de versión.
            </li>
            <li>
              <strong>Interferencia de Componentes:</strong>
              La falta de una gestión precisa de dependencias lleva a
              interferencia entre componentes, donde operaciones en un
              componente (por ejemplo: una actualización) pueden romper software
              no relacionado.
            </li>
          </ul>
          <p>
            Estos problemas no son exclusivos de RPM sino que son endémicos de
            los gestores de paquetes tradicionales, que priorizan la uniformidad
            en todo el sistema sobre el aislamiento y la reproducibilidad.
          </p>
        </section>

        <section>
          <h3>Modelos de Despliegue en Windows y MacOS</h3>
          <h4>El Modelo monolítico y empaquetado</h4>
          <p>
            Este enfoque prioriza la simplicidad para el usuario final y la
            estabilidad de la aplicación internalizando dependencias. Cada
            aplicación es una unidad autónoma.
          </p>
          <p>
            Esto se logra mediante enlace estático o empaquetando bibliotecas
            dinámicas dentro del directorio privado de la aplicación, lo que nos
            da algunas ventajas:
          </p>
          <ul>
            <li>
              <strong>Aislamiento y Estabilidad:</strong> Una aplicación no
              puede ser rota por cambios en otra. No hay dependencia compartida
              o "namespace" que corromper.
            </li>
            <li>
              <strong>Simplicidad para Usuarios:</strong> La instalación es a
              menudo tan simple como arrastrar un paquete; la desinstalación
              implica borrarlo. No se requiere resolución compleja de
              dependencias por parte del usuario.
            </li>
            <li>
              <strong>Confiabilidad para Desarrolladores:</strong> Los
              desarrolladores envían un conjunto conocido y probado de binarios.
            </li>
          </ul>
          <p>Sin embargo, este enfoque puede traer algunas desventajas:</p>
          <ul>
            <li>
              <strong>Ineficiencia (Sin Compartir):</strong> Si N aplicaciones
              usan la misma dependencia M, se duplica N veces. Esto lleva a un
              uso de disco/memoria/caché de Θ(NM) en lugar del óptimo Θ(N+M).
            </li>
            <li>
              <strong>Seguridad y Mantenimiento:</strong> Una vulnerabilidad en
              una biblioteca común (ej., libpng) debe parchearse en cada paquete
              de aplicación que la contenga, un proceso que depende de que cada
              proveedor emita una actualización.
            </li>
            <li>
              <strong>Carga de Composición:</strong> El desarrollador, no el
              sistema, debe ensamblar manualmente todas las dependencias
              correctas en el paquete.
            </li>
          </ul>
        </section>
        <section>
          <h3>
            El Modelo de Biblioteca Compartida Global (Linux Tradicional y
            Windows Clásico)
          </h3>
          <p>
            Este modelo prioriza la eficiencia del sistema creando un namespace
            global y mutable para componentes compartidos. Esto funciona
            instalando en ubicaciones centrales como /usr/lib en Linux y
            C:\Windows\System32 en Windows, y estas aplicaciones se enlazan
            dinámicamente a estos archivos compartidos. Lo que nos trae algunas
            ventajas:
          </p>
          <ul>
            <li>
              <strong>Eficiencia:</strong> Las dependencias compartidas se
              almacenan y cargan en memoria una vez.
            </li>
          </ul>
          <p>también nos trae grandes desventajas:</p>
          <ul>
            <li>
              El "Infierno DLL": Este es el modo de fallo catastrófico. El
              namespace global y mutable se convierte en un punto de conflicto.
              Instalar, actualizar o remover la Aplicación "A" puede reemplazar
              o borrar una biblioteca compartida (Foo.dll v1.0 -&gt; v2.0),
              rompiendo instantáneamente la Aplicación "B" que dependía del
              comportamiento exacto de v1.0. Lo que hace que las restricciones
              de versión sean nominales y no aplicables.
            </li>
            <li>
              <strong>Fragilidad:</strong> La estabilidad del sistema es una red
              de dependencias implícitas y sin versionar. La desinstalación
              correcta es casi imposible sin romper algo más.
            </li>
          </ul>
          <p>
            Windows y Mac OS X tienden a usar despliegue monolítico para
            aplicaciones, excepto por algunas dependencias de grano grueso en el
            entorno del sistema operativo, como el kernel, las bibliotecas GUI
            principales o DirectX. Las dependencias tienden a distribuirse como
            parte de la aplicación misma, sin compartir dependencias entre
            aplicaciones.
          </p>
          <p>
            Esto puede lograrse mediante enlace estático o teniendo bibliotecas
            dinámicas como parte del namespace privado (árbol de directorios) de
            la aplicación (ej., C:\Program Files\MyApp\Foo.DLL). Si bien esto
            reduce la complejidad del despliegue en la máquina del usuario
            final, tiene varios inconvenientes.
          </p>
          <p>
            Primero, elimina el compartir: si dos aplicaciones usan el "mismo"
            componente, terminarán usando copias privadas. El resultado es un
            mayor consumo de recursos en términos de espacio en disco, RAM,
            eficiencia de caché, tiempo de descarga, etcétera.
          </p>
          <p>
            Claramente, es malo si, por ejemplo, todas las dependencias del
            programa no se compartieran. En el peor caso, obtenemos una
            explosión cuadrática en los requisitos de espacio en disco: si
            tenemos N aplicaciones que comparten las mismas M dependencias,
            entonces necesitamos espacio en disco Θ(NM) en lugar de Θ(N + M).
            Segundo, todavía requiere que el desarrollador obtenga y componga
            los componentes, típicamente a través de un proceso semi-manual.
            Especialmente elegantes desde la perspectiva del usuario final son
            los paquetes de aplicación de Mac OS, que son árboles de directorios
            que contienen todos los archivos pertenecientes a una aplicación.
            Generalmente, tales paquetes son autónomos, excepto por dependencias
            de componentes del sistema operativo. Al contrario de las típicas
            aplicaciones de Windows, no tienen otras dependencias de entorno
            como configuraciones del registro. Esto significa que los paquetes
            pueden copiarse o moverse arbitrariamente en el sistema de archivos.
            Por ejemplo, todo Microsoft Office en Mac OS puede copiarse entre
            máquinas arrastrándolo de un disco a otro. Nuevamente, la limitación
            de este enfoque es que se desmorona cuando los componentes tienen
            dependencias entre sí. Es decir, el enfoque de paquetes funciona
            solo para componentes de "nivel superior", es decir, aplicaciones de
            usuario final. Históricamente, Windows ha sufrido del infierno DLL,
            resultado de un namespace global no gestionado utilizado para
            almacenar dependencias compartidas, ej., el directorio
            C:\Windows\System. Una instalación o desinstalación de una
            aplicación frecuentemente causaba que otras aplicaciones se
            rompieran porque una biblioteca compartida (DLL) sería reemplazada
            con una versión incompatible, o borrada por completo.
          </p>
        </section>
        <section>
          <h2>¿Cómo resuelve Nix este problema?</h2>
          <p>
            Nix aborda los problemas fundamentales del despliegue de software
            tradicional a través de una arquitectura radicalmente diferente
            basada en la gestión de paquetes puramente funcional. Así es como
            aborda cada problema:
          </p>
          <h3>Resolviendo el Infierno de Dependencias con Entornos Aislados</h3>
          <p>
            En sistemas tradicionales, los componentes comparten un namespace
            global (como /usr/bin o C:\Windows\System32), causando conflictos de
            versión y problemas de "funciona en mi máquina".
          </p>
          <p>
            Nix resuelve este problema instalando cada paquete en un directorio
            inmutable y único en el almacén Nix (ej.,
            /nix/store/5m66p9z...-glibc-2.35). El nombre del directorio contiene
            un hash criptográfico derivado de:
          </p>
          <ul>
            <li>
              Todas las dependencias de construcción (versiones exactas,
              banderas de compilación, etc.)
            </li>
            <li>Hash del código fuente</li>
            <li>Scripts de construcción y configuración</li>
          </ul>
          <p>
            Esto significa que múltiples versiones de la misma biblioteca pueden
            coexistir pacíficamente porque un script de construcción o
            configuración diferente puede cambiar el hash. Las dependencias son
            exactas porque un paquete depende de rutas de almacén específicas o
            de un hash criptográfico, no solo de números de versión. También no
            más "infierno DLL", ya que cada paquete obtiene su propio entorno
            aislado con precisamente las dependencias necesarias. Esto significa
            también que estos paquetes pueden compartirse entre componentes sin
            comprometerlos en una actualización o eliminación del paquete que
            los estaba usando.
          </p>
          <h3>Resolviendo Dependencias Inexactas con Pureza Funcional</h3>
          <p>
            El problema aquí es que las dependencias son nominales como
            "Necesito glibc &gt;= 2.30" en lugar de exactas, llevándonos a
            problemas de compatibilidad.
          </p>
          <p>
            Nix resuelve este problema especificando dependencias como rutas de
            almacén o hashes criptográficos. Apunta a hashes exactos como
            "/nix/store/addscvwjybbjjb... glibc-2.35", lo que asegura que:
          </p>
          <ul>
            <li>
              El mismo binario exacto (construido con el mismo compilador,
              banderas, parches) se usa en todas partes.
            </li>
            <li>
              <strong>Sin ambigüedad:</strong> diferentes construcciones de
              "glibc-2.35" obtienen diferentes rutas de almacén.
            </li>
            <li>
              <strong>Reproducibilidad completa:</strong> las mismas entradas
              siempre producen la misma ruta de almacén.
            </li>
          </ul>
          <h3>
            Resolviendo Inconsistencia en el Despliegue con Construcciones
            Reproducibles
          </h3>
          <p>
            Nuestro problema aquí es que el software se comporta de manera
            diferente en distintas máquinas debido a dependencias ocultas o
            diferencias ambientales.
          </p>
          <p>
            La solución aquí es que las construcciones ocurren en entornos
            aislados que contienen solo dependencias declaradas explícitamente.
            El proceso de construcción:
          </p>
          <ol>
            <li>
              Comienza con un entorno mínimo (solo entradas especificadas)
            </li>
            <li>
              No usa bibliotecas del sistema a menos que se declaren
              explícitamente
            </li>
            <li>Establece rutas precisas a todas las dependencias</li>
            <li>Registra todas las entradas para futura reproducibilidad</li>
          </ol>
          <p>
            Esto elimina los problemas de "funciona en mi máquina" porque el
            entorno de construcción está perfectamente controlado y es
            reproducible.
          </p>
          <h3>
            Resolviendo Actualizaciones Seguras y Reversiones con Inmutabilidad
          </h3>
          <p>
            El problema es que actualizar o eliminar un paquete puede romper
            aplicaciones dependientes.
          </p>
          <p>
            Nix resuelve este problema usando el Almacén Nix, que es inmutable y
            de solo adición.
          </p>
          <ul>
            <li>Instalar una nueva versión no sobrescribe la anterior</li>
            <li>
              Las versiones antiguas permanecen disponibles mientras sean
              necesarias
            </li>
            <li>
              Las configuraciones del sistema referencian rutas de almacén
              específicas
            </li>
            <li>
              Las reversiones son instantáneas y garantizadas para funcionar
              (simplemente cambiar a la configuración anterior)
            </li>
          </ul>
          <p>
            Por ejemplo, después de actualizar glibc, las aplicaciones antiguas
            continúan usando el glibc antiguo, las nuevas aplicaciones usan el
            nuevo glibc y ambos pueden coexistir sin conflicto.
          </p>
          <h3>
            Resolviendo el Descubrimiento de Dependencias con el Lenguaje Nix
          </h3>
          <p>
            Nuestro problema es que los componentes deben encontrar sus
            dependencias a través de rutas globales o variables de entorno.
          </p>
          <p>
            <strong>La solución que trae Nix:</strong> El lenguaje Nix calcula
            automáticamente grafos de dependencias y configura entornos:
          </p>
          <ul>
            <li>Los paquetes declaran sus dependencias exactas.</li>
            <li>
              Nix construye grafos de dependencias y asegura que todas las
              dependencias estén disponibles.
            </li>
            <li>
              Los entornos de tiempo de ejecución se construyen con rutas
              precisas a todas las dependencias necesarias.
            </li>
            <li>Sin contaminación de PATH global o LD_LIBRARY_PATH.</li>
          </ul>
        </section>

        <section>
          <p>
            Esto es solo una pequeña porción del poder de Nix. En el futuro
            podríamos hablar también sobre:
          </p>
          <ul>
            <li>
              NixOS: un sistema operativo que utiliza el gestor de paquetes Nix
              para instalar software y el lenguaje Nix para configurar el
              sistema, haciéndolo inquebrantable porque puede hacer reversiones
              si algo sale mal.
            </li>
            <li>
              Nix-Shells: un entorno creado dentro de una shell sin preocuparse
              por el sistema operativo.
            </li>
            <li>
              Nix flakes: una nueva forma de empaquetar y hacer Nix-shells,
              paquetes y configuraciones replicables byte por byte.
            </li>
          </ul>
        </section>

        <footer>
          <p>
            Esta guía está basada en la tesis doctoral de Eelco Dolstra y en la
            documentación de la comunidad Nix.
          </p>
          <div className="footer-links">
            <a href="https://nixos.org" target="_blank">
              Sitio Web Oficial de Nix
            </a>
            <a href="https://nixos.org/learn" target="_blank">
              Tutoriales de Nix
            </a>
            <a href="https://github.com/NixOS/nixpkgs" target="_blank">
              Nixpkgs en GitHub
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
          <h1>What is Nix?</h1>
          <span>January 31, 2026 </span>
          <span>15 min read</span>
        </header>

        <section>
          <p>
            If you've been on a Linux journey for a while, you've probably heard
            the name <strong>Nix</strong>. You might have searched for it, only
            to be met with concepts that seemed confusing or dense. If that
            sounds familiar, you're not alone. So, let's break it down:
          </p>

          <h4>
            At its heart, Nix is a powerful and unique ecosystem built around
            one core principle: reliable and reproducible software deployment.
            This ecosystem primarily consists of three interconnected
            components:
          </h4>
          <ul>
            <li>
              <strong>Nix Packages:</strong> This is the world's largest and
              most up-to-date software repository, boasting over 
              <strong>120,000 active packages </strong>. But it's not just about
              quantity. The magic lies in how these packages are built and
              managed, ensuring consistent results across different systems.
            </li>
            <li>
              <strong>The Nix language:</strong> This is the glue that holds
              everything together. It's a purely functional, lazily
              evaluated programming language designed specifically
              for declarative configuration and package definitions. Instead of
              writing step-by-step instructions (imperative), you declare what
              you want your system or package to look similar in spirit to
              languages like Haskell.
            </li>
            <li>
              <strong>NixOS:</strong>  This is where the ecosystem becomes a
              full-fledged operating system. NixOS uses the Nix language and
              Nixpkgs to define your entire system configuration in a single set
              of declarative files.
            </li>
          </ul>

          <p>
            So, what's the big deal? The combination of these tools solves
            critical problems in software management: dependency conflicts, the
            "works on my machine" syndrome, and the difficulty of rolling back
            changes. With Nix, you can create isolated, reproducible
            environments for development, ensure your system configuration is
            version-controlled and consistent, and share your setup with others,
            knowing it will work exactly the same way.
          </p>
          <p>
            But how everything started?, well it started as a tesis of Eelco
            Dolstra, where was looking for a system that were really reliable
            being able to control a complete deployment
          </p>
        </section>

        <section>
          <h3>Understanding Software Deployment Models</h3>
          <p>
            Software deployment fundamentally involves transferring a set of
            files that constitute a program to an end-user system. While this
            may appear straightforward, the process is fraught with challenges
            that can be categorized into two primary areas: environmental
            issues and manageability issues.
          </p>

          <h4>Environmental Issues</h4>
          <ul>
            <li>
              Environmental challenges primarily concern software dependencies.
              A program may rely on specific software components or require
              particular system modifications to function correctly. If these
              conditions are not met—or if they differ from the developer’s
              environment—the software may fail.
            </li>
            <li>
              Operating systems are inherently complex and non-deterministic. It
              is often impossible to guarantee the presence of required
              dependencies, as software components are rarely self-contained and
              frequently depend on other components. This problem is exacerbated
              when packaging software, as dependencies may only become apparent
              upon deployment to a different machine.
            </li>
            <li>
              Dependencies are not limited to runtime components. When deploying
              from source, build-time dependencies such as compilers and
              libraries are necessary, yet these are seldom included by default
              in most operating systems.
            </li>
            <li>
              Version compatibility further complicates deployment. Software
              dependencies evolve, and newer versions may introduce breaking
              changes. Ensuring that the correct versions are available is
              critical for functionality.
            </li>
            <li>
              Even if all required dependencies are present, a component must be
              able to locate them. This typically involves searching predefined
              paths, such as CLASSPATH or binary directories, as is common in
              Linux enviroments.
            </li>
          </ul>

          <p>
            Additionally, some components may depend on non-software artifacts,
            such as configuration files or user accounts, adding another layer
            of environmental complexity.
          </p>

          <h4>Manageability Issues</h4>
          <p>Software management introduces its own set of challenges:</p>
          <ul>
            <li>
              <strong>Uninstallation:</strong> Removing a component safely
              requires deleting configuration files, removing entries from paths
              like CLASSPATH, and ensuring that no other software depends on the
              same dependencies. Failure to do so may break other applications.
            </li>
            <li>
              <strong>Updates:</strong>
              Most package managers do not support concurrent installation of
              multiple versions of the same software. Updates typically
              overwrite existing versions without verifying compatibility with
              dependent software, leading to potential system instability.
            </li>
          </ul>
          <p>
            These issues contribute to the "DLL Hell" scenario, where updating
            or uninstalling one application disrupts others that share
            dependencies. Dependency specifications in traditional package
            managers are inherently unreliable, as they rely on nominal
            identifiers (names and version ranges) rather than precise,
            immutable artifact references. This allows functionally incompatible
            components with identical version identifiers to satisfy
            dependencies, undermining system integrity.
          </p>
        </section>
        <section>
          <h3>Traditional Package Management</h3>
          <p>
            RPM (Red Hat Package Manager) is a widely used low-level deployment
            tool in Linux distributions. It installs and manages components
            while maintaining metadata to prevent unsafe upgrades or
            uninstalls.For example,an RPM package is built from source using:
          </p>
          <pre>
            <code>rpm build -ba hello.tar.gz</code>
          </pre>
          <p>
            The resulting package (for example: hello-1.0.i686.rpm) is
            transferred to client machines and installed via:
          </p>

          <pre>
            <code>rpm -i hello-1.0.i686.rpm</code>
          </pre>
          <p>
            RPM tracks file ownership, verifies file integrity through
            cryptographic hashes, and enforces dependency constraints. For
            instance, if a package xhello depends on hello,
            uninstalling hello is blocked while xhello remains installed.
          </p>
          <p>However, RPM suffers from fundamental limitations:</p>
          <ul>
            <li>
              <strong>Inability to Validate Dependencies:</strong> Dependency
              specifications (for example: Requires: hello) are nominal and
              based on component names rather than functional properties. This
              makes it impossible to guarantee correctness, as any component
              named hello—regardless of its actual behavior or version—may
              satisfy the requirement.
            </li>
            <li>
              <strong>Versioning Inexactitude:</strong> While RPM supports
              version constraints (for example: Requires: hello &ge; 1.0), these
              remain nominal and assume backward compatibility, which cannot be
              guaranteed. Even "exact" dependencies (for example: Requires:
              hello = 1.0) are unreliable, as differently patched or compiled
              versions may bear the same name and version number.
            </li>
            <li>
              <strong>Component Interference:</strong>
              The lack of precise dependency management leads to interference
              between components, where operations on one component (for
              example: an update) may break unrelated software.
            </li>
          </ul>
          <p>
            These issues are not unique to RPM but are endemic to traditional
            package managers, which prioritize system-wide uniformity over
            isolation and reproducibiliity
          </p>
        </section>

        <section>
          <h3>Deployment Models on Windows and MacOS</h3>
          <h4>The Monolitch and Blundled Model</h4>
          <p>
            his approach prioritizes end-user simplicity and application
            stability by internalizing dependencies. Each application is a
            self-contained unit.
          </p>
          <p>
            This is achieved via static linking or by bundling dynamic libraries
            within the applications private directory which give us some
            advantages:
          </p>
          <ul>
            <li>
              <strong>Isolation & Stability:</strong> An application cannot be
              broken by changes to another. There is no shared dependency or
              "namespace" to corrupt.
            </li>
            <li>
              <strong>Simplicity for Users:</strong> Installation is often as
              simple as dragging a bundle; uninstallation involves deleting it.
              No complex dependency resolution is required from the user.
            </li>
            <li>
              <strong>Reliability for Developers:</strong> Developers ship a
              known, tested set of binaries.
            </li>
          </ul>
          <p>However this approach can give some disadvantages:</p>
          <ul>
            <li>
              <strong>Inefficiency (No Sharing):</strong> If N applications use
              the same dependency M, it is duplicated N times. This leads to
              Θ(NM) disk/memory/cache usage instead of the optimal Θ(N+M).
            </li>
            <li>
              <strong>Security & Maintenance:</strong> A vulnerability in a
              common library (e.g., libpng) must be patched in every single
              application bundle that contains it, a process reliant on each
              vendor issuing an update.
            </li>
            <li>
              <strong>Composition Burden:</strong> The developer, not the
              system, must manually assemble all correct dependencies into the
              bundle.
            </li>
          </ul>
        </section>
        <section>
          <h3>
            The Global Shared Library Mode(Traditional Linux and Classic
            Windows)
          </h3>
          <p>
            This model prioritizes system efficiency by creating a global,
            mutable namespace for shared components this work by installing into
            central locations like usr/lib in linux and C:\Windows\System32 in
            Windows, and this applications are dynamically linked to these
            shared files. Which bring us some advantages:
          </p>
          <ul>
            <li>
              <strong>Efficiency:</strong> Shared dependencies are stored and
              loaded in memory once.
            </li>
          </ul>
          <p>also bring us a big disadvantages:</p>
          <ul>
            <li>
              The "DLL Hell": This is the catastrophic failure mode. The
              mutable, global namespace becomes a point of conflict. Installing,
              updating, or removing Application "A" can replace or delete a
              shared library (Foo.dll v1.0 -&gt; v2.0), instantly breaking
              Application "B" which relied on the exact behavior of v1.0. which
              makes version constraints that are nominal and unenforceable.
            </li>
            <li>
              <strong>Fragility:</strong> The system's stability is a web of
              implicit, unversioned dependencies. Correct uninstallation is
              nearly impossible without breaking something else.
            </li>
          </ul>
          <p>
            Windows and Mac OS X tend to use monolithic deployment for
            applications, except for some large-grained dependencies on the
            operating system environment like on the kernel, the core Gui
            libraries or Direct X, dependencies tend to be distributed as part
            of the application itself, with no sharing of dependencies between
            applications.
          </p>
          <p>
            This can be accomplished through static linking or by having dy-
            namic libraries be part of the private namespace (directory tree) of
            the application (e.g., C:\Program Files\MyApp\Foo.DLL). While this
            reduces deployment complexity at the end user machine, it has
            several downsides.
          </p>
          <p>
            First, it removes sharing: if two applications use the “same”
            component, they will nevertheless end up using private copies. The
            result is increased resource consumption in terms of disk space,
            RAM, cache efficiency, download time, and so on.
          </p>
          <p>
            Clearly, it is bad if for example all the program’s dependencies
            were unshared. In the worst case, we get a quadratic blowup in the
            disk space require- ments: if we have N applications that share the
            same M dependencies, then we need disk space Θ(NM) instead of Θ(N +
            M). Second, it still requires the developer to obtain and compose
            the components, typically through a semi-manual process. Especially
            elegant from an end-user perspective are Mac OS’s application
            bundles, which are directory trees containing all files belonging to
            an application. Generally, such bundles are self-contained, except
            for operating system component dependencies. Con- trary to typical
            Windows applications, they do not have other environment
            dependencies such as registry settings. This means that bundles can
            be copied or moved around in the file system arbitrarily. For
            instance, the whole of Microsoft Office on Mac OS can be copied
            between machines by dragging it from one disk to another. Again, the
            limitation of this approach is that it falls apart when components
            have dependencies on each other. That is, the bundle approach works
            only for “top level” components, i.e., end-user applications .
            Historically, Windows has suffered from the DLL hell, a result of an
            unmanaged global namespace being used to store shared dependencies,
            e.g., the directory C:\Windows\System. An installation or
            uninstallation of one application frequently caused other ap-
            plications to break because a shared library (DLL) would be replaced
            with an incompatible version, or deleted altogether.
          </p>
        </section>
        <section>
          <h2>How Nix Solve this problem?</h2>
          <p>
            Nix tackles the fundamental issues of traditional software
            deployment through a radically different architecture based
            on purely functional package management. Here's how it addresses
            each problem:
          </p>
          <h3>Solving Dependency Hell with Isolated Environments</h3>
          <p>
            In traditional systems components share a global namespace
            (like /usr/bin or C:\Windows\System32), causing version conflicts
            and "works on my machine" issues.
          </p>
          <p>
            Nix solve this problem installing every package in an immutable,
            unique directory in the Nix store
            (e.g., /nix/store/5m66p9z...-glibc-2.35). The directory name
            contains a cryptographic hash derived from:
          </p>
          <ul>
            <li>All build dependencies (exact versions, build flags, etc.)</li>
            <li>Source code hash</li>
            <li>Build scripts and configuration</li>
          </ul>
          <p>
            This means that multiple versions of the same library can coexist
            peacefully because a diferentent build script or configuration can
            change the hash, dependencies are exact because a package depends on
            specific store path or cryptographic hash, not just version numbers,
            also no more "DLL hell" due to each package gets it own isolated
            environment with precisely the dependencies, this means also that
            this packages can be share between components without compromising
            them in an update or deletion of the package that was using it.
          </p>
          <h3>Solving Inexact Dependencies with Functional Purity</h3>
          <p>
            The problem here is that dependencies are nominal like "I need glibc
            &gt;= 2.30" instead of exact, leading us to compatibility issues.
          </p>
          <p>
            Nix solves this problem by specifying dependencies as store paths or
            cryptographic hashesm it points to exact hashes like
            "/nix/store/addscvwjybbjjb... glic-2.35" which ensures that:
          </p>
          <ul>
            <li>
              The exact same binary (built with same compiler, flags, patches)
              is used everywhere.
            </li>
            <li>
              <strong>No ambiguity:</strong> different builds of "glibc-2.35"
              get different store paths.
            </li>
            <li>
              <strong>Complete reproducibility:</strong> the same inputs always
              produce the same store path.
            </li>
          </ul>
          <h3>Solving Deployment Inconsistency with Reproducible Builds</h3>
          <p>
            Our problem here is that software here behaves differently accross
            machines due to hidden dependencies or environment differences.
          </p>
          <p>
            The solution here is Builds happend in isolated environments that
            contain only explicitly declared dependencies. The build process:
          </p>
          <ol>
            <li>Starts with a minimal environment (only specified inputs)</li>
            <li>Uses no system libraries unless explicitly declared</li>
            <li>Sets precise paths to all dependencies</li>
            <li>Records all inputs for future reproducibility</li>
          </ol>
          <p>
            This eliminates "works on my machine" problems because the build
            environment is perfectly controlled and reproducible.
          </p>
          <h3>Solving Safe Updates and Rollbacks with Immutability</h3>
          <p>
            The problem is that  updating or removing a package can break
            dependent applications.
          </p>
          <p>
            Nix solve this problem using the Nix Store, which is inmutable and
            append only
          </p>
          <ul>
            <li>Installing a new version doesn't overwrite the old one</li>
            <li>Old versions remain available as long as needed</li>
            <li>System configurations reference specific store paths</li>
            <li>
              Rollbacks are instant and guaranteed to work (just switch to
              previous configuration)
            </li>
          </ul>
          <p>
            For example, after updating glibc, old applications continue using
            the old glibc, new application use the new glibc and both can
            coexist without conflict
          </p>
          <h3>Solving Dependency Discovery with the Nix Language</h3>
          <p>
            Our problem is that components must find their dependencies through
            global paths or environment variables
          </p>
          <p>
            <strong>The solution that Nix brings:</strong> The Nix
            language automatically computes dependency graphs and sets up
            environments:
          </p>
          <ul>
            <li>Packages declare their exact dependencies.</li>
            <li>
              Nix builds dependency graphs and ensures all dependencies are
              available.
            </li>
            <li>
              Runtime environments are constructed with precise paths to all
              needed dependencies.
            </li>
            <li>No global PATH or LD_LIBRARY_PATH pollution.</li>
          </ul>
        </section>

        <section>
          <p>
            This is just a small portion of the power of Nix in a future we
            could talk also about:
          </p>
          <ul>
            <li>
              NixOS an operating system that uses the Nix package manager for
              installing software and the Nix language for configuring the
              system making it unbreakable because can make rollbacks if
              something goes wrong
            </li>
            <li>
              Nix-Shells a environment created inside a shell without worrying
              about the operating system{" "}
            </li>
            <li>
              Nix flakes a new way of packaging and making Nix-shells, packages
              and configurations replicable byte by byte.
            </li>
          </ul>
        </section>

        <footer>
          <p>
            This guide is based on Eelco Dolstra's PhD thesis and the Nix
            community documentation.
          </p>
          <div className="footer-links">
            <a href="https://nixos.org" target="_blank">
              Official Nix Website
            </a>
            <a href="https://nixos.org/learn" target="_blank">
              Nix Tutorials
            </a>
            <a href="https://github.com/NixOS/nixpkgs" target="_blank">
              Nixpkgs GitHub
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

export default WhatIsNix;
