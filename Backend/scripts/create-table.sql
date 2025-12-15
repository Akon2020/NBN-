-- ============================================
-- NYUMBANI EXPRESS DATABASE SCHEMA
-- Application de gestion immobilière
-- Bukavu, Sud-Kivu, RDC
-- ============================================

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'agent', 'utilisateur')),
    statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'suspendu')),
    photo_profil VARCHAR(500),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_statut (statut)
);

-- Table des biens à louer
CREATE TABLE IF NOT EXISTS rentals (
    id SERIAL PRIMARY KEY,
    type_bien VARCHAR(50) NOT NULL CHECK (type_bien IN ('Appartement', 'Studio', 'Maison', 'Villa', 'Bureau', 'Magasin', 'Entrepôt', 'Terrain')),
    sous_type VARCHAR(50),
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    prix_mensuel DECIMAL(15, 2) NOT NULL,
    devise VARCHAR(10) DEFAULT 'USD' CHECK (devise IN ('USD', 'CDF')),
    
    -- Localisation
    province VARCHAR(100) DEFAULT 'Sud-Kivu',
    ville VARCHAR(100) DEFAULT 'Bukavu',
    commune VARCHAR(100) NOT NULL,
    quartier VARCHAR(100) NOT NULL,
    avenue VARCHAR(200),
    numero_parcelle VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Caractéristiques
    superficie DECIMAL(10, 2),
    nombre_chambres INTEGER,
    nombre_salles_bain INTEGER,
    nombre_salons INTEGER,
    nombre_cuisines INTEGER,
    nombre_garages INTEGER,
    nombre_etages INTEGER,
    annee_construction INTEGER,
    
    -- Équipements
    cuisine_equipee BOOLEAN DEFAULT FALSE,
    meuble BOOLEAN DEFAULT FALSE,
    climatisation BOOLEAN DEFAULT FALSE,
    chauffage BOOLEAN DEFAULT FALSE,
    piscine BOOLEAN DEFAULT FALSE,
    jardin BOOLEAN DEFAULT FALSE,
    terrasse BOOLEAN DEFAULT FALSE,
    balcon BOOLEAN DEFAULT FALSE,
    ascenseur BOOLEAN DEFAULT FALSE,
    securite_24h BOOLEAN DEFAULT FALSE,
    parking BOOLEAN DEFAULT FALSE,
    acces_internet BOOLEAN DEFAULT FALSE,
    eau_courante BOOLEAN DEFAULT FALSE,
    electricite BOOLEAN DEFAULT FALSE,
    generateur BOOLEAN DEFAULT FALSE,
    
    -- Informations de contact
    nom_proprietaire VARCHAR(200),
    email_contact VARCHAR(255),
    
    -- Scoring automatique (CTO feature)
    score_bien INTEGER DEFAULT 0 CHECK (score_bien >= 0 AND score_bien <= 100),
    score_localisation INTEGER DEFAULT 0,
    score_equipements INTEGER DEFAULT 0,
    score_prix INTEGER DEFAULT 0,
    
    -- Statut et gestion
    statut VARCHAR(20) DEFAULT 'disponible' CHECK (statut IN ('disponible', 'loué', 'en_attente', 'indisponible')),
    disponibilite_immediate BOOLEAN DEFAULT TRUE,
    date_disponibilite DATE,
    
    -- Métadonnées
    vues INTEGER DEFAULT 0,
    nombre_favoris INTEGER DEFAULT 0,
    nombre_propositions INTEGER DEFAULT 0,
    agent_id INTEGER REFERENCES users(id),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_type_bien (type_bien),
    INDEX idx_commune (commune),
    INDEX idx_quartier (quartier),
    INDEX idx_prix (prix_mensuel),
    INDEX idx_statut (statut),
    INDEX idx_score (score_bien),
    INDEX idx_agent (agent_id),
    INDEX idx_location (latitude, longitude)
);

-- Table des biens à vendre
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    type_bien VARCHAR(50) NOT NULL CHECK (type_bien IN ('Appartement', 'Studio', 'Maison', 'Villa', 'Bureau', 'Magasin', 'Entrepôt', 'Terrain', 'Immeuble')),
    sous_type VARCHAR(50),
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    prix_vente DECIMAL(15, 2) NOT NULL,
    devise VARCHAR(10) DEFAULT 'USD' CHECK (devise IN ('USD', 'CDF')),
    negociable BOOLEAN DEFAULT TRUE,
    
    -- Localisation
    province VARCHAR(100) DEFAULT 'Sud-Kivu',
    ville VARCHAR(100) DEFAULT 'Bukavu',
    commune VARCHAR(100) NOT NULL,
    quartier VARCHAR(100) NOT NULL,
    avenue VARCHAR(200),
    numero_parcelle VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Caractéristiques
    superficie DECIMAL(10, 2),
    nombre_chambres INTEGER,
    nombre_salles_bain INTEGER,
    nombre_salons INTEGER,
    nombre_cuisines INTEGER,
    nombre_garages INTEGER,
    nombre_etages INTEGER,
    annee_construction INTEGER,
    
    -- Équipements
    cuisine_equipee BOOLEAN DEFAULT FALSE,
    meuble BOOLEAN DEFAULT FALSE,
    climatisation BOOLEAN DEFAULT FALSE,
    chauffage BOOLEAN DEFAULT FALSE,
    piscine BOOLEAN DEFAULT FALSE,
    jardin BOOLEAN DEFAULT FALSE,
    terrasse BOOLEAN DEFAULT FALSE,
    balcon BOOLEAN DEFAULT FALSE,
    ascenseur BOOLEAN DEFAULT FALSE,
    securite_24h BOOLEAN DEFAULT FALSE,
    parking BOOLEAN DEFAULT FALSE,
    acces_internet BOOLEAN DEFAULT FALSE,
    eau_courante BOOLEAN DEFAULT FALSE,
    electricite BOOLEAN DEFAULT FALSE,
    generateur BOOLEAN DEFAULT FALSE,
    
    -- Documents légaux
    titre_propriete BOOLEAN DEFAULT FALSE,
    permis_construire BOOLEAN DEFAULT FALSE,
    certificat_enregistrement BOOLEAN DEFAULT FALSE,
    
    -- Informations de contact
    nom_proprietaire VARCHAR(200),
    email_contact VARCHAR(255),
    
    -- Scoring automatique (CTO feature)
    score_bien INTEGER DEFAULT 0 CHECK (score_bien >= 0 AND score_bien <= 100),
    score_localisation INTEGER DEFAULT 0,
    score_equipements INTEGER DEFAULT 0,
    score_prix INTEGER DEFAULT 0,
    
    -- Statut et gestion
    statut VARCHAR(20) DEFAULT 'disponible' CHECK (statut IN ('disponible', 'vendu', 'en_negociation', 'reserve', 'indisponible')),
    
    -- Métadonnées
    vues INTEGER DEFAULT 0,
    nombre_favoris INTEGER DEFAULT 0,
    nombre_propositions INTEGER DEFAULT 0,
    agent_id INTEGER REFERENCES users(id),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_type_bien (type_bien),
    INDEX idx_commune (commune),
    INDEX idx_quartier (quartier),
    INDEX idx_prix (prix_vente),
    INDEX idx_statut (statut),
    INDEX idx_score (score_bien),
    INDEX idx_agent (agent_id),
    INDEX idx_location (latitude, longitude)
);

-- Table des numéros de téléphone pour les locations
CREATE TABLE IF NOT EXISTS rental_phones (
    id SERIAL PRIMARY KEY,
    rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    numero_telephone VARCHAR(20) NOT NULL,
    type_contact VARCHAR(50) DEFAULT 'principal' CHECK (type_contact IN ('principal', 'secondaire', 'whatsapp', 'urgence')),
    ordre INTEGER DEFAULT 1,
    INDEX idx_rental (rental_id)
);

-- Table des numéros de téléphone pour les ventes
CREATE TABLE IF NOT EXISTS sale_phones (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    numero_telephone VARCHAR(20) NOT NULL,
    type_contact VARCHAR(50) DEFAULT 'principal' CHECK (type_contact IN ('principal', 'secondaire', 'whatsapp', 'urgence')),
    ordre INTEGER DEFAULT 1,
    INDEX idx_sale (sale_id)
);

-- Table des images des biens à louer
CREATE TABLE IF NOT EXISTS rental_images (
    id SERIAL PRIMARY KEY,
    rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    url_image VARCHAR(500) NOT NULL,
    description VARCHAR(200),
    est_principale BOOLEAN DEFAULT FALSE,
    ordre INTEGER DEFAULT 1,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rental (rental_id),
    INDEX idx_principale (est_principale)
);

-- Table des images des biens à vendre
CREATE TABLE IF NOT EXISTS sale_images (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    url_image VARCHAR(500) NOT NULL,
    description VARCHAR(200),
    est_principale BOOLEAN DEFAULT FALSE,
    ordre INTEGER DEFAULT 1,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sale (sale_id),
    INDEX idx_principale (est_principale)
);

-- Table des favoris
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type_bien VARCHAR(10) NOT NULL CHECK (type_bien IN ('rental', 'sale')),
    bien_id INTEGER NOT NULL,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(user_id, type_bien, bien_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type_bien),
    INDEX idx_bien (bien_id)
);

-- Table de l'historique des propositions (CTO feature)
CREATE TABLE IF NOT EXISTS proposals_history (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES users(id),
    client_nom VARCHAR(200) NOT NULL,
    client_telephone VARCHAR(20) NOT NULL,
    client_email VARCHAR(255),
    
    -- Détails de la proposition
    nombre_biens INTEGER NOT NULL,
    type_proposition VARCHAR(20) NOT NULL CHECK (type_proposition IN ('location', 'vente', 'mixte')),
    message_whatsapp TEXT,
    
    -- Statut du suivi
    statut VARCHAR(30) DEFAULT 'envoyé' CHECK (statut IN ('envoyé', 'vu', 'intéressé', 'non_intéressé', 'visite_programmée', 'conclu', 'abandonné')),
    date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_reponse TIMESTAMP,
    
    notes TEXT,
    INDEX idx_agent (agent_id),
    INDEX idx_statut (statut),
    INDEX idx_date (date_envoi)
);

-- Table des biens inclus dans chaque proposition
CREATE TABLE IF NOT EXISTS proposal_properties (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER NOT NULL REFERENCES proposals_history(id) ON DELETE CASCADE,
    type_bien VARCHAR(10) NOT NULL CHECK (type_bien IN ('rental', 'sale')),
    bien_id INTEGER NOT NULL,
    ordre INTEGER DEFAULT 1,
    INDEX idx_proposal (proposal_id)
);

-- Table des paramètres système
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    type_valeur VARCHAR(20) DEFAULT 'string' CHECK (type_valeur IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    categorie VARCHAR(50),
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_par INTEGER REFERENCES users(id),
    INDEX idx_cle (cle),
    INDEX idx_categorie (categorie)
);

-- Table des logs d'activité
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entite VARCHAR(50) NOT NULL,
    entite_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entite (entite, entite_id),
    INDEX idx_date (date_action)
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titre VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'proposition', 'nouveau_bien')),
    lu BOOLEAN DEFAULT FALSE,
    lien VARCHAR(500),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_lecture TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_lu (lu),
    INDEX idx_date (date_creation)
);

-- Table de recherches sauvegardées
CREATE TABLE IF NOT EXISTS saved_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nom_recherche VARCHAR(200) NOT NULL,
    type_recherche VARCHAR(10) NOT NULL CHECK (type_recherche IN ('rental', 'sale', 'both')),
    criteres JSONB NOT NULL,
    notifications_actives BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
);

-- ============================================
-- VUES POUR FACILITER LES REQUÊTES
-- ============================================

-- Vue combinée de tous les biens (locations + ventes)
CREATE OR REPLACE VIEW all_properties AS
SELECT 
    'rental' as source_type,
    id,
    type_bien,
    titre,
    description,
    prix_mensuel as prix,
    devise,
    commune,
    quartier,
    superficie,
    nombre_chambres,
    nombre_salles_bain,
    score_bien,
    statut,
    agent_id,
    date_creation
FROM rentals
UNION ALL
SELECT 
    'sale' as source_type,
    id,
    type_bien,
    titre,
    description,
    prix_vente as prix,
    devise,
    commune,
    quartier,
    superficie,
    nombre_chambres,
    nombre_salles_bain,
    score_bien,
    statut,
    agent_id,
    date_creation
FROM sales;

-- Vue des statistiques des agents
CREATE OR REPLACE VIEW agent_statistics AS
SELECT 
    u.id as agent_id,
    u.nom,
    u.prenom,
    u.email,
    COUNT(DISTINCT r.id) as nombre_locations,
    COUNT(DISTINCT s.id) as nombre_ventes,
    COUNT(DISTINCT p.id) as nombre_propositions,
    COALESCE(SUM(r.vues), 0) + COALESCE(SUM(s.vues), 0) as total_vues,
    u.date_creation
FROM users u
LEFT JOIN rentals r ON r.agent_id = u.id
LEFT JOIN sales s ON s.agent_id = u.id
LEFT JOIN proposals_history p ON p.agent_id = u.id
WHERE u.role = 'agent'
GROUP BY u.id, u.nom, u.prenom, u.email, u.date_creation;
