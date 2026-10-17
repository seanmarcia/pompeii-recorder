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
  "Larry Ludwicki",
  "David Mayeske",
  "Rich Olimpio",
  "Matthew Selmheimer",
  "Linda Swanson",
  "Pam Wood",
  "Leslie Xavier",
  "Ted Xavier",
];

export const RESEARCHER_NAMES = ["Lisa Khan", "Mary Meier", "Suzanne Stone"];

export const usernameFor = (fullName) => fullName.toLowerCase().replace(/ /g, "");

// Lets any recorder sign in with no connection, even on a device they've never
// used. Only a slow PBKDF2 hash of the shared recorder password is stored here,
// never the password itself. Researcher (admin) passwords are deliberately not
// included; researchers can sign in offline on devices they've used before.
// Regenerate if the recorder password changes:
//   node -e 'console.log(require("crypto").pbkdf2Sync(PASSWORD, SALT, 200000, 32, "sha256").toString("hex"))'
export const RECORDER_OFFLINE_CHECK = {
  salt: "635a2d41fda94c56f94443763b05946c",
  iterations: 200000,
  hash: "91150b55912eb88fc2a97d1ee30465a115f7ee66ddc15b935d2fb95cd064d45e",
};
