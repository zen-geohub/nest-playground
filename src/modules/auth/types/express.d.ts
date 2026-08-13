interface User {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export {};
