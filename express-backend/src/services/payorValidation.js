const normalize = (s) => String(s || '').trim();

const validateRequired = (value, label) => {
  const v = normalize(value);
  if (!v) return `${label} is required`;
  return null;
};

const validateIdNumber = (idType, idNumber) => {
  const type = normalize(idType).toLowerCase();
  const num = normalize(idNumber);
  if (!type) return 'ID Type is required';
  if (!num) return 'ID Number is required';

  if (type === 'passport') {
    if (!/^[a-z0-9]{6,12}$/i.test(num)) return 'Passport number must be 6-12 alphanumeric characters';
    return null;
  }

  if (type === 'national_id') {
    if (!/^\d{8,12}$/.test(num)) return 'National ID must be 8-12 digits';
    return null;
  }

  if (type === 'drivers_license') {
    if (!/^[a-z0-9-]{6,20}$/i.test(num)) return "Driver's license must be 6-20 characters (letters, numbers, dashes)";
    return null;
  }

  if (!/^[a-z0-9-]{4,32}$/i.test(num)) return 'ID Number format is invalid';
  return null;
};

const validateContact = (contact) => {
  const phone = normalize(contact?.phone);
  const email = normalize(contact?.email);

  if (!phone && !email) return 'At least one contact detail (phone or email) is required';
  if (phone && !/^[0-9+() -]{7,20}$/.test(phone)) return 'Phone number format is invalid';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email format is invalid';
  return null;
};

const validatePayorPayload = (payload) => {
  const errors = {};

  const firstNameErr = validateRequired(payload?.firstName, 'First Name');
  if (firstNameErr) errors.firstName = firstNameErr;

  const lastNameErr = validateRequired(payload?.lastName, 'Last Name');
  if (lastNameErr) errors.lastName = lastNameErr;

  const addressErr = validateRequired(payload?.address, 'Address');
  if (addressErr) errors.address = addressErr;

  const idTypeErr = validateRequired(payload?.idType, 'ID Type');
  if (idTypeErr) errors.idType = idTypeErr;

  const idNumberErr = validateIdNumber(payload?.idType, payload?.idNumber);
  if (idNumberErr) errors.idNumber = idNumberErr;

  const contactErr = validateContact(payload?.contact);
  if (contactErr) errors.contact = contactErr;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
};

const normalizeIdKey = (idType, idNumber) => `${normalize(idType).toLowerCase()}::${normalize(idNumber).toUpperCase()}`;

module.exports = {
  validatePayorPayload,
  normalizeIdKey,
};

