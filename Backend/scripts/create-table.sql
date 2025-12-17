-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  idUser BIGINT AUTO_INCREMENT PRIMARY KEY,
  fullName VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  profilePhoto VARCHAR(255),
  role ENUM('admin', 'agent', 'consultant') DEFAULT 'agent',
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  lastLoginAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================
-- PROPERTIES (TABLE CENTRALE)
-- =========================
CREATE TABLE properties (
  idProperty BIGINT AUTO_INCREMENT PRIMARY KEY,

  category ENUM('RENT', 'SALE') NOT NULL,

  propertyType ENUM(
    'APPARTEMENT',
    'MAISON',
    'CONSTRUCTION_DURABLE',
    'CONSTRUCTION_SEMI_DURABLE',
    'TERRAIN_PLAT',
    'TERRAIN_PENTE'
  ) NOT NULL,

  quartier VARCHAR(100) NOT NULL,
  avenue VARCHAR(100),
  fullAddress VARCHAR(255),

  floors INT,
  bedrooms INT DEFAULT 0,
  livingRooms INT DEFAULT 0,
  toilets INT DEFAULT 0,
  kitchens INT DEFAULT 0,

  price DECIMAL(12,2) NOT NULL,
  margin DECIMAL(12,2),

  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  description TEXT,
  createdBy BIGINT,
  isActive BOOLEAN DEFAULT TRUE,

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (createdBy) REFERENCES users(idUser),

  INDEX idxCategory (category),
  INDEX idxPropertyType (propertyType),
  INDEX idxPrice (price),
  INDEX idxQuartier (quartier)
);

-- =========================
-- RENTAL PROPERTIES
-- =========================
CREATE TABLE rentalProperties (
  idProperty BIGINT PRIMARY KEY,
  guarantee DECIMAL(12,2),
  unit ENUM('DAY', 'MONTH', 'YEAR') NOT NULL,

  FOREIGN KEY (idProperty) REFERENCES properties(idProperty) ON DELETE CASCADE
);

-- =========================
-- SALE PROPERTIES
-- =========================
CREATE TABLE saleProperties (
  idProperty BIGINT PRIMARY KEY,

  FOREIGN KEY (idProperty) REFERENCES properties(idProperty) ON DELETE CASCADE
);

-- =========================
-- PROPERTY IMAGES (MAX 20)
-- =========================
CREATE TABLE propertyImages (
  idPropertyImage BIGINT AUTO_INCREMENT PRIMARY KEY,
  idProperty BIGINT NOT NULL,
  image VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (idProperty) REFERENCES properties(idProperty) ON DELETE CASCADE
);

-- =========================
-- PROPERTY PHONES (MIN 2)
-- =========================
CREATE TABLE propertyPhones (
  idPropertyPhone BIGINT AUTO_INCREMENT PRIMARY KEY,
  idProperty BIGINT NOT NULL,
  phoneNumber VARCHAR(20) NOT NULL,

  FOREIGN KEY (idProperty) REFERENCES properties(idProperty) ON DELETE CASCADE
);

-- =========================
-- FAVORITES
-- =========================
CREATE TABLE favorites (
  idUser BIGINT NOT NULL,
  idProperty BIGINT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (idUser, idProperty),
  FOREIGN KEY (idUser) REFERENCES users(idUser),
  FOREIGN KEY (idProperty) REFERENCES properties(idProperty)
);

-- =========================
-- PROPOSALS (WHATSAPP)
-- =========================
CREATE TABLE proposals (
  idProposal BIGINT AUTO_INCREMENT PRIMARY KEY,
  idProperty BIGINT NOT NULL,
  clientName VARCHAR(150),
  clientPhone VARCHAR(20),
  message TEXT,
  sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (idProperty) REFERENCES properties(idProperty)
);

-- =========================
-- PROPERTY SCORES
-- =========================
CREATE TABLE propertyScores (
  idProperty BIGINT PRIMARY KEY,
  score DECIMAL(5,2) DEFAULT 0,

  FOREIGN KEY (idProperty) REFERENCES properties(idProperty) ON DELETE CASCADE
);

-- =========================
-- ACTIVITY LOGS (DASHBOARD 48H)
-- =========================
CREATE TABLE activityLogs (
  idActivityLog BIGINT AUTO_INCREMENT PRIMARY KEY,
  idUser BIGINT,
  action VARCHAR(100),
  entity VARCHAR(50),
  entityId BIGINT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (idUser) REFERENCES users(idUser),
  INDEX idxRecentActivity (createdAt)
);
