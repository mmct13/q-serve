# Q-Serve

Q-Serve est un système de gestion de file d'attente permettant aux clients de s'enregistrer pour obtenir un ticket et aux agents de gérer les appels et les services. Le projet inclut un backend Node.js avec Express et MySQL, un frontend Next.js avec DaisyUI pour une interface moderne et responsive, et un écran d'affichage déporté avec annonces vocales via Web Speech API. Les mises à jour en temps réel sont gérées via Socket.io.

# Fonctionnalités

- **Côté Agent** :
  - Connexion avec nom et mot de passe.
  - Tableau de bord pour visualiser les clients en attente (`waiting`) et en service (`in_service`).
  - Actions : appeler un client, terminer un service, changer de statut (`available`, `busy`, `unavailable`).
- **Côté Client** :
  - Enregistrement avec prénom et nom pour générer un ticket.
  - Suivi du statut du ticket (`waiting`, `in_service`, `done`) en temps réel.
- **Affichage déporté** :
  - Affiche le dernier client appelé (numéro de ticket et guichet).
  - Liste défilante des clients en attente.
  - Annonces vocales via Web Speech API (ex. : "Client numéro X, veuillez vous présenter au guichet Y").
- **Synchronisation** : Mises à jour en temps réel via WebSocket pour les changements de file et de statut.
- **Interface** : Design responsive avec DaisyUI (basé sur Tailwind CSS).

# Prérequis

- Node.js : v16 ou supérieur
- MySQL : v8 ou supérieur
- npm : v8 ou supérieur
- Navigateur moderne (pour Web Speech API, recommandé : Chrome)

# Structure du projet

- **backend/** : API Express avec TypeScript, MySQL, Socket.io
  - `src/index.ts` : Point d'entrée du serveur
  - `src/routes/agent.ts` : Routes pour les agents (login, queue, call, complete, status)
  - `src/routes/client.ts` : Routes pour les clients (register, status, tickets)
  - `src/db.ts` : Connexion à MySQL
- **q-serve/** : Frontend Next.js avec TypeScript et DaisyUI
  - `app/login/page.tsx` : Page de connexion pour les agents
  - `app/agent/page.tsx` : Tableau de bord des agents
  - `app/client/page.tsx` : Interface pour l'enregistrement et le suivi des clients
  - `app/display/page.tsx` : Écran d'affichage déporté avec annonces vocales
  - `app/globals.css` : Styles globaux incluant l'animation marquee

# Installation

1. Cloner le dépôt :
   ```
   git clone <URL_DU_DEPOT>
   cd q-serve
   ```

2. Configurer le backend :
   ```
   cd backend
   npm install
   ```
   - Configure la base de données MySQL dans `src/db.ts` :
     ```
     import mysql from 'mysql2/promise';

     const pool = mysql.createPool({
       host: 'localhost',
       user: 'root',
       password: 'your_password',
       database: 'qserve',
     });

     export default pool;
     ```
   - Crée la base de données et les tables :
     ```
     CREATE DATABASE qserve;
     USE qserve;

     CREATE TABLE agents (
       id INT AUTO_INCREMENT PRIMARY KEY,
       name VARCHAR(50) NOT NULL,
       password VARCHAR(255) NOT NULL,
       status ENUM('available', 'busy', 'unavailable') DEFAULT 'unavailable'
     );

     CREATE TABLE queue (
       id INT AUTO_INCREMENT PRIMARY KEY,
       customer_name VARCHAR(100) NOT NULL,
       ticket_number INT NOT NULL,
       status ENUM('waiting', 'in_service', 'done') DEFAULT 'waiting',
       assigned_agent VARCHAR(50),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );

     INSERT INTO agents (name, password, status) VALUES
     ('Agent1', 'password123', 'unavailable'),
     ('Agent2', 'password456', 'unavailable');

     INSERT INTO queue (customer_name, ticket_number, status) VALUES
     ('Jean Dupont', 1, 'waiting'),
     ('Marie Curie', 2, 'waiting');
     ```

3. Configurer le frontend :
   ```
   cd q-serve
   npm install
   ```

4. Dépendances :
   - Backend : `express`, `mysql2`, `socket.io`, `typescript`, `ts-node`, `@types/express`, `@types/node`, `@types/socket.io`, `cors`, `@types/cors`, `express-validator`, `bcrypt`
   - Frontend : `next`, `react`, `react-dom`, `typescript`, `@types/react`, `@types/react-dom`, `socket.io-client`, `tailwindcss`, `daisyui`

# Exécution

1. Lancer le backend :
   ```
   cd backend
   npm start
   ```
   Le serveur s'exécute sur `http://localhost:3001`. Vérifie la route `/health` pour confirmer.

2. Lancer le frontend :
   ```
   cd q-serve
   npm run dev
   ```
   L'application est accessible sur `http://localhost:3000`.

3. URLs principales :
   - `/login` : Connexion des agents
   - `/agent` : Tableau de bord des agents
   - `/client` : Interface pour l'enregistrement et le suivi des clients
   - `/display` : Écran d'affichage déporté

# Utilisation

- **Agents** :
  - Connectez-vous sur `/login` (ex. : `Agent1`, `password123`).
  - Dans `/agent`, changez votre statut à `available`, appelez un client, puis terminez le service.
- **Clients** :
  - Sur `/client`, entrez votre prénom et nom pour obtenir un ticket.
  - Suivez le statut de votre ticket en temps réel (passe à `in_service` ou `done`).
- **Affichage** :
  - Sur `/display`, visualisez le dernier client appelé et la liste défilante des clients en attente.
  - Les annonces vocales sont jouées automatiquement pour chaque nouvel appel.
- **Mises à jour** : Les changements (ex. : appel d’un client) sont reflétés en temps réel via WebSocket.

# Prochaines étapes

- Sécurisation :
  - Hacher les mots de passe avec `bcrypt`.
  - Utiliser JWT pour gérer les sessions (remplacer `localStorage`).
- Validation : Ajouter `express-validator` pour valider les entrées API.
- Tests : Implémenter des tests unitaires avec Jest/React Testing Library.
- Améliorations UI : Ajouter des animations DaisyUI et personnaliser les thèmes.
- Accessibilité : Ajouter des sous-titres pour les annonces vocales.

# Contribution

1. Créez une branche pour vos modifications :
   ```
   git checkout -b feature/<nom-de-la-fonctionnalite>
   ```
2. Testez localement avant de pousser.
3. Soumettez une pull request avec un message de commit clair.

# Licence

MIT License (à définir selon vos besoins).
