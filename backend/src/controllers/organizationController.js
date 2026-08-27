const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { supabase, supabaseAdmin, useMock } = require('../config/db');

const DOCUMENTS_BUCKET = 'Documents';
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  'COMPANY_REGISTRATION',
  'GST_CERTIFICATE',
  'PAN',
  'ADDRESS_PROOF',
  'IEC_EXPORT_LICENSE',
  'IMPORT_LICENSE',
  'PRODUCT_LICENSE',
  'CERTIFICATION',
  'OTHER'
]);

const sanitizeFilename = (name = 'document') => {
  const fallback = 'document';
  const parts = name.split('.');
  const extension = parts.length > 1 ? parts.pop().replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) : '';
  const base = (parts.join('.') || fallback)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100) || fallback;

  return extension ? `${base}.${extension}` : base;
};

const getDocumentBuffer = (document) => {
  if (!document?.data) return null;
  const base64 = document.data.includes(',')
    ? document.data.split(',').pop()
    : document.data;
  return Buffer.from(base64, 'base64');
};

const detectDocumentMimeType = (buffer) => {
  const header = buffer.subarray(0, 12).toString('hex');

  if (header.startsWith('25504446')) return 'application/pdf';
  if (header.startsWith('ffd8ff')) return 'image/jpeg';
  if (header.startsWith('89504e47')) return 'image/png';
  if (header.startsWith('52494646') && header.slice(16, 24) === '57454250') return 'image/webp';

  return null;
};

const createDocumentHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const validateRegistrationDocument = (document) => {
  if (!document) return null;

  const mimeType = document.mimeType;
  const documentType = document.documentType || 'COMPANY_REGISTRATION';
  const fileName = document.fileName || 'registration-document';
  const buffer = getDocumentBuffer(document);

  if (!buffer || buffer.length === 0) {
    return { error: 'Uploaded document is empty or unreadable.' };
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    return { error: 'Unsupported document type. Upload a PDF, JPEG, PNG, or WebP file.' };
  }

  const detectedMimeType = detectDocumentMimeType(buffer);
  if (detectedMimeType !== mimeType) {
    return { error: 'Document contents do not match the selected file type.' };
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
    return { error: 'Invalid KYB document type.' };
  }

  if (buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    return { error: 'Uploaded document exceeds the 10 MB limit.' };
  }

  return { buffer, mimeType, documentType, fileName };
};

const createSignedDocumentUrl = async (filePath) => {
  if (!filePath || !supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  if (error) {
    console.error('[Documents] Signed URL error:', error.message);
    return null;
  }

  return data?.signedUrl || null;
};

// =========================================================================
// MOCK DATABASE STORE (Runs when Supabase is not configured)
// =========================================================================
let mockOrganizations = [
  {
    id: 'org_mock_1',
    legal_name: 'Atlas Global Exports',
    trade_name: 'Atlas Global',
    verification_status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    adminName: 'Rahul Mehta',
    email: 'rahul@atlasglobal.com'
  },
  {
    id: 'org_mock_2',
    legal_name: 'Nexus International Trading',
    trade_name: 'Nexus International',
    verification_status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    adminName: 'Sarah Williams',
    email: 'sarah@nexustrading.com'
  },
  {
    id: 'org_mock_3',
    legal_name: 'Pacific Mercantile Ltd',
    trade_name: 'Pacific Mercantile',
    verification_status: 'VERIFIED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    adminName: 'Arjun Shah',
    email: 'arjun@pacificmercantile.com'
  },
  {
    id: 'org_mock_4',
    legal_name: 'Vertex Trade Solutions',
    trade_name: 'Vertex Trade',
    verification_status: 'REJECTED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    adminName: 'Emily Carter',
    email: 'emily@vertextrade.com'
  }
];

let mockUsers = [
  { id: 'usr_mock_1', email: 'rahul@atlasglobal.com', name: 'Rahul Mehta', orgId: 'org_mock_1', password: 'password123' },
  { id: 'usr_mock_2', email: 'sarah@nexustrading.com', name: 'Sarah Williams', orgId: 'org_mock_2', password: 'password123' },
  { id: 'usr_mock_3', email: 'arjun@pacificmercantile.com', name: 'Arjun Shah', orgId: 'org_mock_3', password: 'password123' },
  { id: 'usr_mock_4', email: 'emily@vertextrade.com', name: 'Emily Carter', orgId: 'org_mock_4', password: 'password123' }
];

let mockDocuments = [];

// =========================================================================
// CONTROLLER HANDLERS
// =========================================================================

// 1. Register Organization
exports.registerOrganization = async (req, res) => {
  const { adminName, organizationName, email, password, role, document } = req.body;

  if (!organizationName || !adminName || !email || !password) {
    return res.status(400).json({ message: 'Missing required registration fields.' });
  }

  const validatedDocument = validateRegistrationDocument(document);
  if (validatedDocument?.error) {
    return res.status(400).json({ message: validatedDocument.error });
  }

  if (useMock) {
    // Check if user already exists in mock users
    if (mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const orgId = `org_${uuidv4().substring(0, 8)}`;
    const userId = `usr_${uuidv4().substring(0, 8)}`;

    const newOrg = {
      id: orgId,
      legal_name: organizationName,
      trade_name: organizationName,
      verification_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      adminName: adminName,
      email: email
    };

    const newUser = {
      id: userId,
      email: email,
      name: adminName,
      orgId: orgId,
      password: password, // plain password for mock login demo
      role: role || 'admin'
    };

    mockOrganizations.push(newOrg);
    mockUsers.push(newUser);

    let uploadedDocument = null;
    if (validatedDocument) {
      uploadedDocument = {
        id: `doc_${uuidv4().substring(0, 8)}`,
        user_id: userId,
        document_type: validatedDocument.documentType,
        file_name: validatedDocument.fileName,
        file_path: `${userId}/${validatedDocument.documentType}/${sanitizeFilename(validatedDocument.fileName)}`,
        mime_type: validatedDocument.mimeType,
        file_size: validatedDocument.buffer.length,
        organization_id: orgId,
        document_hash: createDocumentHash(validatedDocument.buffer),
        verification_status: 'PENDING',
        uploaded_at: new Date().toISOString(),
        is_active: true,
        url: document.data
      };
      mockDocuments.push(uploadedDocument);
    }

    console.log(`[MOCK REGISTRATION] Organization: ${organizationName}, Status: PENDING`);

    return res.status(201).json({
      message: 'Organization registered under verification.',
      organization: newOrg,
      user: { id: userId, email, name: adminName, role: newUser.role },
      document: uploadedDocument
    });
  }

  // Real Supabase Flow
  try {
    // A. Sign up User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    const authUserId = authData.user.id;
    const orgId = uuidv4();
    const publicUserId = authUserId; // Using auth.users.id as public.users.id reference

    // B. Create Organization
    const { error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({
        id: orgId,
        legal_name: organizationName,
        trade_name: organizationName,
        verification_status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (orgErr) {
      return res.status(500).json({ message: 'Failed to create organization record.', error: orgErr.message });
    }

    // C. Create Public User Record
    const nameParts = adminName.split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { error: userErr } = await supabaseAdmin
      .from('users')
      .insert({
        id: publicUserId,
        auth_id: authUserId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        account_type: 'EXTERNAL',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (userErr) {
      return res.status(500).json({ message: 'Failed to create public user record.', error: userErr.message });
    }

    // D. Connect User and Org in members table
    const memberId = uuidv4();
    const { error: memberErr } = await supabaseAdmin
      .from('organization_members')
      .insert({
        id: memberId,
        organization_id: orgId,
        user_id: publicUserId,
        organization_role: 'ORGANIZATION_ADMIN',
        is_active: true,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (memberErr) {
      return res.status(500).json({ message: 'Failed to link user and organization.', error: memberErr.message });
    }

    let uploadedDocument = null;
    if (validatedDocument) {
      const documentId = uuidv4();
      const storagePath = `${publicUserId}/${validatedDocument.documentType}/${Date.now()}_${sanitizeFilename(validatedDocument.fileName)}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, validatedDocument.buffer, {
          contentType: validatedDocument.mimeType,
          upsert: false
        });

      if (uploadError) {
        return res.status(500).json({ message: 'Failed to upload registration document.', error: uploadError.message });
      }

      const documentHash = createDocumentHash(validatedDocument.buffer);
      const { data: insertedDocument, error: documentErr } = await supabaseAdmin
        .from('verification_documents')
        .insert({
          id: documentId,
          organization_id: orgId,
          document_type: validatedDocument.documentType,
          file_path: storagePath,
          file_name: validatedDocument.fileName,
          document_number: null,
          status: 'PENDING',
          uploaded_by: publicUserId,
          verified_at: null,
          rejection_reason: null,
          expires_at: null,
          document_hash: documentHash,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (documentErr) {
        await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
        return res.status(500).json({ message: 'Failed to save registration document metadata.', error: documentErr.message });
      }

      uploadedDocument = {
        ...insertedDocument,
        url: await createSignedDocumentUrl(storagePath)
      };
    }

    return res.status(201).json({
      message: 'Organization registered under verification.',
      organization: { id: orgId, legal_name: organizationName, verification_status: 'PENDING' },
      user: { id: publicUserId, email, name: adminName },
      document: uploadedDocument
    });

  } catch (error) {
    console.error('[Supabase Registration] Error:', error.message);
    res.status(500).json({ message: 'Registration internal server error', error: error.message });
  }
};

// 2. Login Organization
exports.loginOrganization = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (useMock) {
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const org = mockOrganizations.find(o => o.id === user.orgId);
    if (!org) {
      return res.status(404).json({ message: 'Associated organization not found' });
    }

    // Restriction check
    if (org.verification_status === 'PENDING') {
      return res.status(403).json({
        message: 'Organization under verification. You will be allowed to login once verified by Super Admin.',
        status: 'PENDING'
      });
    }

    if (org.verification_status === 'REJECTED') {
      return res.status(403).json({
        message: 'Organization verification rejected. Login access denied.',
        status: 'REJECTED'
      });
    }

    return res.status(200).json({
      message: 'Login successful',
      token: user.id, // simple identifier for mock token
      user: {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'admin',
        companyName: org.legal_name,
        verificationStatus: org.verification_status
      }
    });
  }

  // Real Supabase Flow
  try {
    // A. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const authUserId = authData.user.id;

    // B. Find member association
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id, organization_role, user_id, users(first_name, last_name, email)')
      .eq('user_id', authUserId)
      .single();

    if (memberError || !memberData) {
      return res.status(404).json({ message: 'User organization association not found.' });
    }

    // C. Get organization details
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('legal_name, verification_status')
      .eq('id', memberData.organization_id)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ message: 'Organization details not found.' });
    }

    if (orgData.verification_status !== 'VERIFIED') {
      await supabase.auth.signOut();
      return res.status(403).json({
        message: `Organization verification status is ${orgData.verification_status}. Login is allowed only after approval.`,
        status: orgData.verification_status
      });
    }

    // D. Restriction check on verification_status
    if (orgData.verification_status === 'PENDING') {
      // Sign out from Supabase Auth to prevent keeping active session
      await supabase.auth.signOut();
      return res.status(403).json({
        message: 'Organization under verification. You will be allowed to login once verified by Super Admin.',
        status: 'PENDING'
      });
    }

    if (orgData.verification_status === 'REJECTED') {
      await supabase.auth.signOut();
      return res.status(403).json({
        message: 'Organization verification rejected. Login access denied.',
        status: 'REJECTED'
      });
    }

    return res.status(200).json({
      message: 'Login successful',
      token: authData.session.access_token,
      user: {
        userId: memberData.user_id,
        name: `${memberData.users.first_name} ${memberData.users.last_name}`.trim(),
        email: memberData.users.email,
        role: memberData.organization_role === 'ORGANIZATION_ADMIN' ? 'admin' : 'salesman',
        companyName: orgData.legal_name,
        verificationStatus: orgData.verification_status
      }
    });

  } catch (error) {
    console.error('[Supabase Login] Error:', error.message);
    res.status(500).json({ message: 'Login internal server error', error: error.message });
  }
};

// 3. Super Admin: List Organizations
exports.getOrganizations = async (req, res) => {
  if (useMock) {
    const organizationsWithDocuments = mockOrganizations.map((org) => {
      return {
        ...org,
        documents: mockDocuments.filter((document) => document.organization_id === org.id && document.is_active)
      };
    });
    return res.status(200).json(organizationsWithDocuments);
  }

  try {
    // Query joined tables to fetch Organization + representative admin name + email
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        legal_name,
        trade_name,
        verification_status,
        created_at,
        organization_members (
          user_id,
          organization_role,
          users (
            first_name,
            last_name,
            email
          )
        )
      `);

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch organizations.', error: error.message });
    }

    const organizationIds = data
      .map(org => org.id)
      .filter(Boolean);

    let documentsByOrganizationId = new Map();
    if (organizationIds.length > 0) {
      const { data: documents, error: documentsError } = await supabaseAdmin
        .from('verification_documents')
        .select('*')
        .in('organization_id', organizationIds)
        .order('created_at', { ascending: false });

      if (documentsError) {
        return res.status(500).json({ message: 'Failed to fetch organization documents.', error: documentsError.message });
      }

      const documentsWithUrls = await Promise.all(
        (documents || []).map(async (document) => ({
          ...document,
          url: await createSignedDocumentUrl(document.file_path)
        }))
      );

      documentsByOrganizationId = documentsWithUrls.reduce((map, document) => {
        const existing = map.get(document.organization_id) || [];
        existing.push(document);
        map.set(document.organization_id, existing);
        return map;
      }, new Map());
    }

    // Format output to be flat & match dashboard interface
    const formattedList = data.map(org => {
      let adminName = 'Representative';
      let email = 'N/A';
      
      const adminMember = org.organization_members?.find(
        m => m.organization_role === 'ORGANIZATION_ADMIN'
      ) || org.organization_members?.[0];

      if (adminMember && adminMember.users) {
        adminName = `${adminMember.users.first_name || ''} ${adminMember.users.last_name || ''}`.trim() || 'Admin';
        email = adminMember.users.email || 'N/A';
      }

      return {
        id: org.id,
        legal_name: org.legal_name,
        trade_name: org.trade_name || org.legal_name,
        verification_status: org.verification_status,
        created_at: org.created_at,
        adminName,
        email,
        documents: documentsByOrganizationId.get(org.id) || []
      };
    });

    return res.status(200).json(formattedList);

  } catch (error) {
    console.error('[Admin getOrganizations] Error:', error.message);
    res.status(500).json({ message: 'Internal server error fetching organizations.' });
  }
};

// 4. Super Admin: Accept / Reject Status
exports.updateOrganizationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // expected: 'VERIFIED' or 'REJECTED'

  if (!status || !['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
    return res.status(400).json({ message: 'Invalid or missing status parameter.' });
  }

  if (useMock) {
    const org = mockOrganizations.find(o => o.id === id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    org.verification_status = status;
    org.updated_at = new Date().toISOString();

    console.log(`[MOCK UPDATE STATUS] Organization: ${org.legal_name}, Status updated to: ${status}`);

    return res.status(200).json({
      message: `Organization status successfully updated to ${status}`,
      organization: org
    });
  }

  try {
    // 1. Update public.organizations status
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        verification_status: status,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Failed to update organization status.', error: updateError.message });
    }

    // 2. Add entry to verification_reviews audit table
    const reviewId = uuidv4();
    await supabaseAdmin
      .from('verification_reviews')
      .insert({
        id: reviewId,
        organization_id: id,
        decision: status === 'VERIFIED' ? 'APPROVED' : 'REJECTED',
        reviewed_at: new Date().toISOString(),
        notes: `Status changed to ${status} via Super Admin Dashboard.`
      });

    return res.status(200).json({
      message: `Organization status successfully updated to ${status}`,
      organization: updatedOrg
    });

  } catch (error) {
    console.error('[Admin updateOrganizationStatus] Error:', error.message);
    res.status(500).json({ message: 'Internal server error updating status.', error: error.message });
  }
};
