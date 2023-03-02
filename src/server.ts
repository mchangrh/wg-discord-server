import Fastify from "fastify"
import { port } from "./config.json"
import { routes as wireguard } from "./wireguard"
import { schedule } from "node-cron";
import { flushPeers } from "./flushPeers";
let peers = new Map();

const EXPIRY_TIME = 1000 * 60 * 60 * 12; // 12 hours

const fastify = Fastify()

fastify.register(wireguard, { prefix: "/" });

fastify.post("/config/:id", (req, reply) => {
  const { id } = req.params as any;
  const config = req.body as any;
  peers.set(id, { config, expiry: new Date().getTime() + EXPIRY_TIME });
  reply.status(200).send();
});

fastify.get("/config/:id", (req, reply) => {
  const { id } = req.params as any;
  console.log(peers)
  if (peers.has(id)) {
    reply.status(200)
      .header("Content-Disposition", `attachment; filename="${id}-config.conf"`)
      .send(peers.get(id.config));
  }
  return reply.status(404).send();
});

fastify.get("*", (req, reply) => {
  reply.status(404).send();
});

fastify.listen({ port });
console.log(`server started on port ${port}`);

schedule('* * * * *', () => {
  flushPeers("wg1", peers);
});