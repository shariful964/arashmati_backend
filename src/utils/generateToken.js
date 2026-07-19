// import jwt from "jsonwebtoken";

// export const generateToken = (user) => {
//   const accessToken = jwt.sign(
//     {
//       id: user._id,
//       email: user.email,
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: "15h" },
//   );

//   const refreshToken = jwt.sign(
//     {
//       id: user._id,
//       email: user.email,
//     },
//     process.env.JWT_REFRESH_SECRET,
//     { expiresIn: "7d" },
//   );
//   return { accessToken, refreshToken };
// };

import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15h" },
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
  return { accessToken, refreshToken };
};
