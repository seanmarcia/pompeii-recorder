// Everyone with a login. Usernames are first + last name run together in
// lowercase (see backend/db/seeds/users.rb, which must list the same people).
export const RECORDER_NAMES = [
  "Lilly Andoe-Liccetti",
  "Carlos Avila",
  "Sera Baker",
  "Alethea Banar",
  "Terry Bruno",
  "Anne Carter",
  "Monica Connors",
  "Loretta Dimitruk",
  "Natalie Dimitruk",
  "Lynette Galloway",
  "Cindy Hacunda",
  "Lilly Lacetti",
  "Larry Ludwicki",
  "David Mayeske",
  "Charlie Meier",
  "Rich Olimpio",
  "Matthew Selmheimer",
  "Linda Swanson",
  "Brian Szczesniak",
  "Pam Wood",
  "John Wissinger",
  "Leslie Xavier",
  "Ted Xavier",
];

export const RESEARCHER_NAMES = ["Lisa Kahn", "Mary Meier", "Suzanne Stone"];

export const usernameFor = (fullName) => fullName.toLowerCase().replace(/ /g, "");

// Named recorders and researchers can sign in offline, even on a new device.
// Only slow PBKDF2 hashes of their shared group passwords are stored here.
// This grants field-app access; the Rails admin portal still requires its server.
// Regenerate the corresponding verifier when either group's password changes:
//   node -e 'console.log(require("crypto").pbkdf2Sync(PASSWORD, SALT, 200000, 32, "sha256").toString("hex"))'
export const RECORDER_OFFLINE_CHECK = {
  salt: "635a2d41fda94c56f94443763b05946c",
  iterations: 200000,
  hash: "91150b55912eb88fc2a97d1ee30465a115f7ee66ddc15b935d2fb95cd064d45e",
};

export const RESEARCHER_OFFLINE_CHECK = {
  salt: "59a066fcd82009d6f19fbbd14a18032d",
  iterations: 200000,
  hash: "119590c527d6a7a045bec4f3646d1e53f6101b901e2ecc1733e08d4e1f4f8b5e",
};
