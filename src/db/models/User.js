'use strict';

/**
 * User DB 모델
 * 사용자 인증 및 관리
 *
 * 주요 기능:
 * - 사용자 CRUD
 * - bcrypt 비밀번호 해싱 (SHA256에서 마이그레이션)
 * - Google OAuth 연동
 * - 로그인 시간 추적
 * - 개인정보 AES-256-GCM 암호화 (username, email, display_name, google_id, facebook_id)
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('..');

// dotenv 로드
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// bcrypt 설정: cost factor 12 (보안과 성능 균형)
const BCRYPT_ROUNDS = 12;

// 통합 암호화 키 (ENCRYPTION_KEY 사용)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * 암호화용 256비트 키 가져오기
 * @returns {Buffer|null} 32바이트 키 또는 null
 */
function getEncryptionKey() {
  if (!ENCRYPTION_KEY) {
    console.warn('[User Model] ENCRYPTION_KEY가 설정되지 않았습니다.');
    return null;
  }
  if (ENCRYPTION_KEY.length !== 64) {
    console.error('[User Model] ENCRYPTION_KEY는 64자 hex여야 합니다.');
    return null;
  }
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

// 하위 호환성을 위한 별칭
const getEmailEncryptionKey = getEncryptionKey;

/**
 * 범용 필드 암호화 (AES-256-GCM)
 * @param {string} plainText - 평문 텍스트
 * @returns {string} 암호화된 텍스트 (base64url) 또는 평문 (키 미설정 시)
 */
function encryptField(plainText) {
  if (!plainText) return null;

  const key = getEncryptionKey();
  if (!key) {
    console.warn('[User Model] 키 미설정 - 평문 저장');
    return plainText;
  }

  try {
    const iv = crypto.randomBytes(12); // GCM 권장 IV 크기

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // IV(12) + AuthTag(16) + Encrypted를 합쳐서 base64url 인코딩
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64url');
  } catch (error) {
    console.error('[User Model] Field encryption failed:', error.message);
    return plainText;
  }
}

/**
 * 범용 필드 복호화 (AES-256-GCM)
 * @param {string} encryptedText - 암호화된 텍스트 (base64url)
 * @returns {string|null} 복호화된 텍스트 또는 null
 */
function decryptField(encryptedText) {
  if (!encryptedText) return null;

  const key = getEncryptionKey();
  if (!key) {
    return encryptedText;
  }

  try {
    const combined = Buffer.from(encryptedText, 'base64url');

    // 최소 길이 확인 (IV 12 + AuthTag 16 = 28 bytes)
    if (combined.length < 28) {
      return encryptedText; // 평문으로 간주
    }

    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    // 복호화 실패 시 평문으로 간주 (마이그레이션 전 데이터)
    return encryptedText;
  }
}

/**
 * 범용 필드 해시 생성 (SHA-256) - 검색용
 * @param {string} value - 평문 값
 * @param {boolean} normalize - 소문자 정규화 여부 (이메일용)
 * @returns {string|null} 해시 문자열
 */
function hashField(value, normalize = false) {
  if (!value) return null;
  const normalizedValue = normalize ? value.toLowerCase().trim() : value;
  return crypto.createHash('sha256').update(normalizedValue).digest('hex');
}

/**
 * 평문 여부 판별
 * @param {string} value - 값
 * @param {string} fieldType - 필드 타입
 * @returns {boolean} 평문 여부
 */
function isPlaintext(value, fieldType) {
  if (!value) return true;

  switch (fieldType) {
    case 'email':
      return value.includes('@');
    case 'username':
      try {
        const buf = Buffer.from(value, 'base64url');
        return buf.length < 28;
      } catch {
        return true;
      }
    case 'google_id':
    case 'facebook_id':
      return /^\d+$/.test(value);
    case 'display_name':
      return !/^[A-Za-z0-9_-]+$/.test(value) || value.length < 28;
    default:
      try {
        const buf = Buffer.from(value, 'base64url');
        return buf.length < 28;
      } catch {
        return true;
      }
  }
}

// 하위 호환성을 위한 이메일 전용 함수
function encryptEmail(email) {
  return encryptField(email);
}

function decryptEmail(encryptedEmail) {
  if (!encryptedEmail) return null;
  if (encryptedEmail.includes('@')) {
    return encryptedEmail;
  }
  return decryptField(encryptedEmail);
}

function hashEmail(email) {
  return hashField(email, true);
}

/**
 * 사용자 객체의 모든 암호화된 필드 복호화
 * @param {Object} user - 사용자 객체
 * @returns {Object} 복호화된 사용자 객체
 */
function decryptUserFields(user) {
  if (!user) return null;

  const decrypted = { ...user };

  // username 복호화
  if (user.username && !isPlaintext(user.username, 'username')) {
    decrypted.username = decryptField(user.username);
  }

  // email 복호화
  if (user.email) {
    decrypted.email = decryptEmail(user.email);
  }

  // display_name 복호화
  if (user.display_name && !isPlaintext(user.display_name, 'display_name')) {
    decrypted.display_name = decryptField(user.display_name);
  }

  // google_id 복호화
  if (user.google_id && !isPlaintext(user.google_id, 'google_id')) {
    decrypted.google_id = decryptField(user.google_id);
  }

  // facebook_id 복호화
  if (user.facebook_id && !isPlaintext(user.facebook_id, 'facebook_id')) {
    decrypted.facebook_id = decryptField(user.facebook_id);
  }

  return decrypted;
}

const User = {
  /**
   * users 테이블 생성 (없으면 생성) + 해시 컬럼 마이그레이션
   */
  async initTable() {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          google_id VARCHAR(255) UNIQUE,
          display_name VARCHAR(255),
          auth_provider VARCHAR(50) DEFAULT 'local',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 해시 컬럼 마이그레이션 (기존 테이블 업그레이드)
      await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS username_hash VARCHAR(64)');
      await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64)');
      await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id_hash VARCHAR(64)');
      await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255)');
      await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id_hash VARCHAR(64)');
      await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255)');
      await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled INTEGER DEFAULT 0');

      // 인덱스 생성
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_username_hash ON users(username_hash)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_google_id_hash ON users(google_id_hash)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_facebook_id_hash ON users(facebook_id_hash)');

      console.log('[User] 테이블 초기화 완료');
    } catch (error) {
      console.error('[User] 테이블 초기화 실패:', error.message);
    }
  },

  /**
   * 비밀번호를 bcrypt로 해시 (async)
   */
  async hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  /**
   * 레거시 SHA256 해시 (마이그레이션용)
   */
  hashPasswordLegacy(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  },

  /**
   * bcrypt 해시 여부 확인
   */
  isBcryptHash(hash) {
    return hash && hash.startsWith('$2');
  },

  /**
   * username으로 사용자 조회 (해시 기반 검색 + 전체 필드 복호화)
   */
  async findByUsername(username) {
    const usernameHash = hashField(username);

    try {
      // 1. username_hash로 검색 (암호화된 데이터)
      let user = await db.get('SELECT * FROM users WHERE username_hash = ?', [usernameHash]);

      // 2. 폴백: 평문 username으로 검색 (마이그레이션 전 데이터)
      if (!user) {
        user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
      }

      return decryptUserFields(user);
    } catch (error) {
      console.error('[User Model] findByUsername error:', error.message);
      return null;
    }
  },

  /**
   * Google ID로 사용자 조회 (해시 기반 검색 + 전체 필드 복호화)
   */
  async findByGoogleId(googleId) {
    const googleIdHash = hashField(googleId);

    try {
      // 1. google_id_hash로 검색 (암호화된 데이터)
      let user = await db.get('SELECT * FROM users WHERE google_id_hash = ?', [googleIdHash]);

      // 2. 폴백: 평문 google_id로 검색 (마이그레이션 전 데이터)
      if (!user) {
        user = await db.get('SELECT * FROM users WHERE google_id = ?', [googleId]);
      }

      return decryptUserFields(user);
    } catch (error) {
      console.error('[User Model] findByGoogleId error:', error.message);
      return null;
    }
  },

  /**
   * Facebook ID로 사용자 조회 (해시 기반 검색 + 전체 필드 복호화)
   */
  async findByFacebookId(facebookId) {
    const facebookIdHash = hashField(facebookId);

    try {
      let user = await db.get('SELECT * FROM users WHERE facebook_id_hash = ?', [facebookIdHash]);

      if (!user) {
        user = await db.get('SELECT * FROM users WHERE facebook_id = ?', [facebookId]);
      }

      return decryptUserFields(user);
    } catch (error) {
      console.error('[User Model] findByFacebookId error:', error.message);
      return null;
    }
  },

  /**
   * 이메일로 사용자 조회 (해시 기반 검색 + 전체 필드 복호화)
   */
  async findByEmail(email) {
    const emailHash = hashEmail(email);

    try {
      // 1. email_hash로 검색 (암호화된 데이터)
      let user = await db.get('SELECT * FROM users WHERE email_hash = ?', [emailHash]);

      // 2. 폴백: 평문 이메일로 검색 (마이그레이션 전 데이터)
      if (!user) {
        user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      }

      return decryptUserFields(user);
    } catch (error) {
      console.error('[User Model] findByEmail error:', error.message);
      return null;
    }
  },

  /**
   * 기존 사용자에 Google 계정 연결 (암호화 + 해시 저장)
   */
  async linkGoogleAccount(username, googleId) {
    const encryptedGoogleId = encryptField(googleId);
    const googleIdHash = hashField(googleId);
    const usernameHash = hashField(username);

    try {
      let result = await db.run(
        'UPDATE users SET google_id = ?, google_id_hash = ? WHERE username_hash = ?',
        [encryptedGoogleId, googleIdHash, usernameHash]
      );
      if (result.changes === 0) {
        await db.run(
          'UPDATE users SET google_id = ?, google_id_hash = ? WHERE username = ?',
          [encryptedGoogleId, googleIdHash, username]
        );
      }
      return { success: true };
    } catch (error) {
      console.error('[User Model] linkGoogleAccount error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 기존 사용자에 Facebook 계정 연결 (암호화 + 해시 저장)
   */
  async linkFacebookAccount(username, facebookId) {
    const encryptedFacebookId = encryptField(facebookId);
    const facebookIdHash = hashField(facebookId);
    const usernameHash = hashField(username);

    try {
      let result = await db.run(
        'UPDATE users SET facebook_id = ?, facebook_id_hash = ? WHERE username_hash = ?',
        [encryptedFacebookId, facebookIdHash, usernameHash]
      );
      if (result.changes === 0) {
        await db.run(
          'UPDATE users SET facebook_id = ?, facebook_id_hash = ? WHERE username = ?',
          [encryptedFacebookId, facebookIdHash, username]
        );
      }
      return { success: true };
    } catch (error) {
      console.error('[User Model] linkFacebookAccount error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 새 사용자 생성 (전체 개인정보 암호화 적용)
   */
  async create(userData) {
    const {
      username,
      email,
      password,
      googleId = null,
      displayName = null,
      authProvider = 'local'
    } = userData;

    // 비밀번호를 bcrypt로 해싱 (이미 bcrypt 해시가 아닌 경우)
    const hashedPassword = this.isBcryptHash(password)
      ? password
      : await this.hashPassword(password);

    // 전체 필드 암호화 및 해시 생성
    const encryptedUsername = encryptField(username);
    const usernameHash = hashField(username);
    const encryptedEmail = encryptEmail(email);
    const emailHash = hashEmail(email);
    const encryptedDisplayName = displayName ? encryptField(displayName) : null;
    const encryptedGoogleId = googleId ? encryptField(googleId) : null;
    const googleIdHash = googleId ? hashField(googleId) : null;

    try {
      const result = await db.run(`
        INSERT INTO users (username, username_hash, email, email_hash, password, google_id, google_id_hash, display_name, auth_provider, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [encryptedUsername, usernameHash, encryptedEmail, emailHash, hashedPassword, encryptedGoogleId, googleIdHash, encryptedDisplayName, authProvider]);

      // ★ user_id_mapping 자동 등록: username을 키로 사용
      // 예: '2026/202602/20260228' → 실제 폴더 save/2026/202602/20260228/{hash}
      try {
        const UserIdEncoder = require('../../utils/userIdEncoder');
        const UserIdMapping = require('./UserIdMapping');
        const hash = UserIdEncoder.encode(username);
        const legacyFolder = Buffer.from(username).toString('base64');
        const datePath = UserIdEncoder.calculateDatePath(); // 지금 KST 날짜
        await UserIdMapping.create(username, hash, legacyFolder, datePath);
        console.log(`[User Model] UserIdMapping 등록: userId=${username}, datePath=${datePath}`);
      } catch (mappingErr) {
        // 매핑 실패는 치명적이지 않음 — 로그만 기록
        console.warn('[User Model] UserIdMapping 등록 실패:', mappingErr.message);
      }

      console.log(`[User Model] User created with encrypted fields: ${username}`);
      return {
        success: true,
        id: result.lastInsertRowid,
        username
      };
    } catch (error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique') || error.message.includes('UNIQUE')) {
        console.warn(`[User Model] 이미 존재하는 사용자: ${username}`);
        return { success: false, message: '이미 존재하는 사용자입니다.' };
      }
      console.error('[User Model] create error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 사용자 정보 업데이트 (전체 개인정보 암호화 적용)
   */
  async update(username, updateData) {
    const allowedFields = ['email', 'password', 'display_name', 'last_login'];
    const updates = [];
    const values = [];
    let emailHashValue = null;
    const usernameHash = hashField(username);

    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        let finalValue = value;

        if (dbField === 'password' && !this.isBcryptHash(value)) {
          finalValue = await this.hashPassword(value);
        }

        if (dbField === 'email') {
          finalValue = encryptEmail(value);
          emailHashValue = hashEmail(value);
        }

        if (dbField === 'display_name' && value) {
          finalValue = encryptField(value);
        }

        updates.push(`${dbField} = ?`);
        values.push(finalValue);
      }
    }

    if (emailHashValue) {
      updates.push('email_hash = ?');
      values.push(emailHashValue);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    try {
      values.push(usernameHash);
      let result = await db.run(`
        UPDATE users SET ${updates.join(', ')} WHERE username_hash = ?
      `, values);

      if (result.changes === 0) {
        values[values.length - 1] = username;
        result = await db.run(`
          UPDATE users SET ${updates.join(', ')} WHERE username = ?
        `, values);
      }
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('[User Model] update error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 마지막 로그인 시간 업데이트 (해시 기반 검색)
   */
  async updateLastLogin(username) {
    const usernameHash = hashField(username);

    try {
      let result = await db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE username_hash = ?',
        [usernameHash]
      );

      if (result.changes === 0) {
        await db.run(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
          [username]
        );
      }
      return true;
    } catch (error) {
      console.error('[User Model] updateLastLogin error:', error.message);
      return false;
    }
  },

  /**
   * 비밀번호 검증 (bcrypt + 레거시 SHA256 지원)
   */
  async verifyPassword(username, password) {
    const user = await this.findByUsername(username);

    if (!user) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    let isValid = false;
    let needsMigration = false;

    try {
      if (this.isBcryptHash(user.password)) {
        isValid = await bcrypt.compare(password, user.password);
      } else {
        const hashedInput = this.hashPasswordLegacy(password);
        isValid = (user.password === hashedInput);
        needsMigration = isValid;
      }
    } catch (error) {
      console.error('[User Model] 비밀번호 검증 오류:', error.message);
      return { success: false, message: '비밀번호 검증 중 오류가 발생했습니다.' };
    }

    if (isValid) {
      if (needsMigration) {
        const bcryptHash = await this.hashPassword(password);
        await this.update(username, { password: bcryptHash });
        console.log(`[User Model] 비밀번호 bcrypt 마이그레이션 완료: ${username}`);
      }

      await this.updateLastLogin(username);

      return {
        success: true,
        user: {
          username: user.username,
          email: user.email,
          authProvider: user.auth_provider,
          displayName: user.display_name
        }
      };
    }

    return { success: false, message: '비밀번호가 올바르지 않습니다.' };
  },

  /**
   * Google 사용자 생성 또는 업데이트 (Upsert) - 전체 필드 암호화 적용
   */
  async upsertGoogleUser(profile) {
    const { id: googleId, emails, displayName } = profile;
    const email = emails[0].value;
    const encryptedEmail = encryptEmail(email);
    const emailHash = hashEmail(email);
    const encryptedDisplayName = displayName ? encryptField(displayName) : null;
    const encryptedGoogleId = encryptField(googleId);
    const googleIdHash = hashField(googleId);

    try {
      // 기존 사용자 찾기 (해시 기반)
      let user = await this.findByGoogleId(googleId);

      if (user) {
        // 기존 사용자 업데이트 (전체 필드 암호화)
        await db.run(`
          UPDATE users
          SET email = ?, email_hash = ?, display_name = ?, google_id = ?, google_id_hash = ?, last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE google_id_hash = ?
        `, [encryptedEmail, emailHash, encryptedDisplayName, encryptedGoogleId, googleIdHash, googleIdHash]);

        user = await this.findByGoogleId(googleId);
        console.log(`[User Model] Google user updated with encrypted fields: ${user.username}`);
        return { success: true, user, isNew: false };
      } else {
        // 새 사용자 생성
        let username = email.split('@')[0];
        let counter = 1;

        while (await this.findByUsername(username)) {
          username = `${email.split('@')[0]}${counter}`;
          counter++;
        }

        const randomPassword = crypto.randomBytes(32).toString('hex');

        const result = await this.create({
          username,
          email,
          password: randomPassword,
          googleId,
          displayName,
          authProvider: 'google'
        });

        if (result.success) {
          user = await this.findByUsername(username);
          // ★ user_id_mapping 자동 등록 (Google 신규 회원): username을 키로 사용
          if (user) {
            try {
              const UserIdEncoder = require('../../utils/userIdEncoder');
              const UserIdMapping = require('./UserIdMapping');
              const hash = UserIdEncoder.encode(user.username);
              const legacyFolder = Buffer.from(user.username).toString('base64');
              const datePath = UserIdEncoder.calculateDatePath();
              await UserIdMapping.create(user.username, hash, legacyFolder, datePath);
              console.log(`[User Model] Google UserIdMapping 등록: userId=${user.username}, datePath=${datePath}`);
            } catch (e) { console.warn('[User Model] Google UserIdMapping 등록 실패:', e.message); }
          }
          console.log(`[User Model] New Google user created with encrypted fields: ${username}`);
          return { success: true, user, isNew: true };
        } else {
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      console.error('[User Model] upsertGoogleUser error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Facebook 사용자 생성 또는 업데이트 (Upsert) - 전체 필드 암호화 적용
   */
  async upsertFacebookUser(profile) {
    const { id: facebookId, emails, displayName } = profile;
    const email = emails && emails[0] ? emails[0].value : `fb_${facebookId}@facebook.placeholder`;
    const encryptedEmail = encryptEmail(email);
    const emailHash = hashEmail(email);
    const encryptedDisplayName = displayName ? encryptField(displayName) : null;
    const encryptedFacebookId = encryptField(facebookId);
    const facebookIdHash = hashField(facebookId);

    try {
      let user = await this.findByFacebookId(facebookId);

      if (user) {
        await db.run(`
          UPDATE users
          SET email = ?, email_hash = ?, display_name = ?, facebook_id = ?, facebook_id_hash = ?, last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE facebook_id_hash = ?
        `, [encryptedEmail, emailHash, encryptedDisplayName, encryptedFacebookId, facebookIdHash, facebookIdHash]);

        user = await this.findByFacebookId(facebookId);
        console.log(`[User Model] Facebook user updated with encrypted fields: ${user.username}`);
        return { success: true, user, isNew: false };
      } else {
        // 이메일로 기존 사용자 찾기 (계정 연결)
        if (email && !email.includes('@facebook.placeholder')) {
          const existingUser = await this.findByEmail(email);
          if (existingUser) {
            await this.linkFacebookAccount(existingUser.username, facebookId);
            const usernameHash = hashField(existingUser.username);
            await db.run(
              'UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE username_hash = ?',
              [usernameHash]
            );

            user = await this.findByFacebookId(facebookId);
            console.log(`[User Model] Facebook account linked to existing user: ${user.username}`);
            return { success: true, user, isNew: false, linked: true };
          }
        }

        // 새 사용자 생성
        let username = email.includes('@facebook.placeholder')
          ? `fb_user_${facebookId.substring(0, 8)}`
          : email.split('@')[0];
        let counter = 1;

        while (await this.findByUsername(username)) {
          username = email.includes('@facebook.placeholder')
            ? `fb_user_${facebookId.substring(0, 8)}_${counter}`
            : `${email.split('@')[0]}${counter}`;
          counter++;
        }

        const encryptedUsername = encryptField(username);
        const usernameHash = hashField(username);
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await this.hashPassword(randomPassword);

        const result = await db.run(`
          INSERT INTO users (username, username_hash, email, email_hash, password, facebook_id, facebook_id_hash, display_name, auth_provider, created_at, last_login)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'facebook', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [encryptedUsername, usernameHash, encryptedEmail, emailHash, hashedPassword, encryptedFacebookId, facebookIdHash, encryptedDisplayName]);

        if (result.lastInsertRowid) {
          user = await this.findByUsername(username);
          // ★ user_id_mapping 자동 등록 (Facebook 신규 회원): username을 키로 사용
          if (user) {
            try {
              const UserIdEncoder = require('../../utils/userIdEncoder');
              const UserIdMapping = require('./UserIdMapping');
              const hash = UserIdEncoder.encode(user.username);
              const legacyFolder = Buffer.from(user.username).toString('base64');
              const datePath = UserIdEncoder.calculateDatePath();
              await UserIdMapping.create(user.username, hash, legacyFolder, datePath);
              console.log(`[User Model] Facebook UserIdMapping 등록: userId=${user.username}, datePath=${datePath}`);
            } catch (e) { console.warn('[User Model] Facebook UserIdMapping 등록 실패:', e.message); }
          }
          console.log(`[User Model] New Facebook user created with encrypted fields: ${username}`);
          return { success: true, user, isNew: true };
        } else {
          return { success: false, error: 'Failed to create user' };
        }
      }
    } catch (error) {
      console.error('[User Model] upsertFacebookUser error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 모든 사용자 조회 (관리자용) - 전체 필드 복호화 적용
   */
  async findAll() {
    try {
      const users = await db.all('SELECT id, username, email, display_name, auth_provider, google_id, facebook_id, created_at, last_login FROM users');
      return users.map(user => decryptUserFields(user));
    } catch (error) {
      console.error('[User Model] findAll error:', error.message);
      return [];
    }
  },

  /**
   * TOTP 설정 업데이트 (해시 기반 검색)
   */
  async updateTotpSettings(username, totpData) {
    const { totpSecret, totpEnabled } = totpData;
    const usernameHash = hashField(username);

    try {
      let result = await db.run(
        'UPDATE users SET totp_secret = ?, totp_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE username_hash = ?',
        [totpSecret, totpEnabled ? 1 : 0, usernameHash]
      );

      if (result.changes === 0) {
        await db.run(
          'UPDATE users SET totp_secret = ?, totp_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
          [totpSecret, totpEnabled ? 1 : 0, username]
        );
      }

      console.log(`[User Model] TOTP settings updated for: ${username}`);
      return { success: true };
    } catch (error) {
      console.error('[User Model] updateTotpSettings error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 사용자 삭제 (해시 기반 검색)
   */
  async delete(username) {
    const usernameHash = hashField(username);

    try {
      let result = await db.run('DELETE FROM users WHERE username_hash = ?', [usernameHash]);

      if (result.changes === 0) {
        result = await db.run('DELETE FROM users WHERE username = ?', [username]);
      }
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('[User Model] delete error:', error.message);
      return { success: false, error: error.message };
    }
  }
};

module.exports = {
  ...User,
  decryptField,
  decryptUserFields
};
