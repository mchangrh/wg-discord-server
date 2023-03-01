import Fastify from "fastify"
import { port } from "./config.json"
import { routes as wireguard } from "./wireguard"

const fastify = Fastify()

fastify.register(wireguard, { prefix: "/wg" });

fastify.get("*", (req, reply) => {
  reply.status(404).send();
});

fastify.listen({ port });
console.log(`server started on port ${port}`);