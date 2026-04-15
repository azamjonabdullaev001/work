-- Типы пользователей и статусы
CREATE TYPE user_role AS ENUM ('freelancer', 'client');
CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- Пользователи
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    patronymic VARCHAR(100),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role user_role NOT NULL,
    title VARCHAR(200),
    bio TEXT,
    hourly_rate DECIMAL(10,2),
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Категории
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50)
);

-- Навыки
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL
);

-- Навыки пользователя
CREATE TABLE user_skills (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, skill_id)
);

-- Портфолио
CREATE TABLE portfolio (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    project_url VARCHAR(500),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Заказы (вакансии)
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    duration VARCHAR(50),
    experience_level VARCHAR(50),
    status job_status DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Навыки для заказа
CREATE TABLE job_skills (
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

-- Предложения (отклики)
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    freelancer_id INT REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    bid_amount DECIMAL(10,2) NOT NULL,
    duration VARCHAR(50),
    status proposal_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Контракты
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id),
    freelancer_id INT REFERENCES users(id),
    client_id INT REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

-- Отзывы
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    contract_id INT REFERENCES contracts(id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id INT REFERENCES users(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Начальные категории
INSERT INTO categories (name, slug, icon) VALUES
    ('Веб-разработка', 'web-development', '💻'),
    ('Мобильная разработка', 'mobile-development', '📱'),
    ('Дизайн и креатив', 'design', '🎨'),
    ('3D-моделирование', '3d-modeling', '🧊'),
    ('Фото и видео', 'photo-video', '📸'),
    ('Маркетинг', 'marketing', '📈'),
    ('Написание текстов', 'writing', '✍️'),
    ('Администрирование', 'admin-support', '📋'),
    ('Data Science и AI', 'data-science', '🤖'),
    ('DevOps и облако', 'devops', '☁️');

-- Начальные навыки
INSERT INTO skills (name, category_id) VALUES
    ('React', 1), ('Vue.js', 1), ('Angular', 1), ('Node.js', 1),
    ('Go', 1), ('Python', 1), ('PHP', 1), ('Java', 1),
    ('TypeScript', 1), ('HTML/CSS', 1), ('PostgreSQL', 1), ('MongoDB', 1),
    ('Swift', 2), ('Kotlin', 2), ('Flutter', 2), ('React Native', 2),
    ('UI/UX Design', 3), ('Figma', 3), ('Adobe Photoshop', 3), ('Adobe Illustrator', 3),
    ('Logo Design', 3), ('Web Design', 3),
    ('Blender', 4), ('3ds Max', 4), ('Maya', 4), ('Cinema 4D', 4),
    ('ZBrush', 4), ('Unity 3D', 4), ('Unreal Engine', 4),
    ('Фотография', 5), ('Видеомонтаж', 5), ('After Effects', 5),
    ('SEO', 6), ('SMM', 6), ('Контекстная реклама', 6),
    ('Копирайтинг', 7), ('Переводы', 7),
    ('Docker', 10), ('Kubernetes', 10), ('AWS', 10), ('Linux', 10);

-- Индексы
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_client ON jobs(client_id);
CREATE INDEX idx_jobs_category ON jobs(category_id);
CREATE INDEX idx_proposals_job ON proposals(job_id);
CREATE INDEX idx_proposals_freelancer ON proposals(freelancer_id);
CREATE INDEX idx_portfolio_user ON portfolio(user_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
