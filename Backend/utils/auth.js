function getRole(req) {
  return req.headers["x-role"] || "user";
}

function getUserId(req) {
  return req.headers["x-user-id"] || "1";
}

function sanitizeUser(user) {
  const name = user.name ?? user.full_name ?? user.fullName ?? "";
  return {
    id: user.id,
    name,
    username: user.username,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword || user.must_change_password),
  };
}

module.exports = {
  getRole,
  getUserId,
  sanitizeUser,
};
