Simulador de Pressupostos per a Esdeveniments

Aquest projecte és un simulador de pressupostos dissenyat per als alumnes del Cicle Formatiu de Grau Superior de Màrqueting i Publicitat. Permet als estudiants practicar el disseny de pressupostos reals per a esdeveniments simulats, incloent la selecció de proveïdors i productes.

Característiques

Proveïdors reals simulats: El sistema inclou proveïdors amb comportaments definits (flexible, rígid, agressiu) per millorar les habilitats de negociació.

Generació de pressupostos: Permet generar pressupostos amb productes personalitzats segons les necessitats de l’esdeveniment.

Generació de PDF: Una vegada es genera el pressupost, es pot descarregar en format PDF.

Historial de pressupostos: Es manté un historial de les cotitzacions anteriors per a referència.

Negociació amb proveïdors: Simula la negociació amb els proveïdors, incloent penalitzacions i bonificacions segons els terminis de lliurament.

Instal·lació
Clonar el repositori:

git clone https://github.com/nomusuari/simulador-pressupostos.git
cd simulador-pressupostos

Instal·lar les dependències (si n'hi ha, com si el projecte inclou algun framework):

npm install

Carregar la pàgina en un servidor local: Pots utilitzar Live Server a VSCode o un servidor web local per carregar l'index.html.

Ús

1. Selecciona un tipus de servei (neteja, càtering, transport, etc.).
2. Escull un proveïdor de la llista disponible per a aquest servei.
3. Tria els productes que necessites per al teu esdeveniment.
4. Especifica la data d'entrega desitjada i visualitza el pressupost simulat, incloent penalitzacions o bonificacions segons la urgència.
5. Genera el pressupost i descarrega’l en format PDF.

Fitxers importants
- index.html: Conté la interfície principal del simulador.
- styles.css: Full d’estil per donar format a l’aplicació.
- script.js: Conté la lògica del simulador, incloent la gestió de productes, proveïdors i la negociació.
- data.json: Fitxer que conté tota la informació dels proveïdors i productes.

Contribuir
Les contribucions són benvingudes! Si vols afegir funcionalitats o corregir errors, segueix els passos següents:

1. Fes un fork del projecte.
2. Clona el teu fork localment.
3. Crea una nova branca per a les teves millores: git checkout -b feature/nom-millora
4. Fes els teus canvis i puja’ls:
git add .
git commit -m "Descripció dels canvis"
git push origin feature/nom-millora
5. Obre una pull request per revisar els canvis.

Llicència

Aquest projecte està sota la llicència MIT. Consulta el fitxer LICENSE per a més detalls.
