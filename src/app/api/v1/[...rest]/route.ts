import { handle, notFound } from "@/server/http";

const missing = () => handle(() => notFound());

export { missing as GET, missing as POST, missing as PUT, missing as PATCH, missing as DELETE };
