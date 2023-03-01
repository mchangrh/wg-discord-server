import { exec } from "child_process";
import { auth, allowed_ifaces } from "./config.json"

export async function routes(fastify, options) {
  fastify.addHook("preValidation", (req, reply, done) => {
    if (req.query.auth !== auth) {
      reply.code(403);
      done(new Error("Not authorized"));
    }
    if (!allowed_ifaces.includes(req.params.iface)) {
      reply.code(403);
      done(new Error("Disallowed interface"));
    } 
    done();
  });

  fastify.delete("/:iface", async function (req, reply) {
    const { pubkey } = req.query
    const { iface } = req.params
    const command = `wg set ${iface} peer ${pubkey} remove`
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        return reply.status(500).send({ error: error || stderr })
      }
      reply.status(200).send({ message: "Peer removed" })
    });
  });
  fastify.post("/:iface", async function (req, reply) {
    const { pubkey, endpoint, allowedips } = req.query
    const { iface } = req.params
    const command = `wg set ${iface} peer ${pubkey} endpoint ${endpoint} allowed-ips ${allowedips}/32`
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        return reply.status(500).send({ error: error || stderr })
      }
      reply.status(201).send({ message: "Peer added" })
    });
  });
  fastify.get("/:iface/ips", async function (req, reply) {
    const { iface } = req.params
    const command = `wg show ${iface} allowed-ips`
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        return reply.status(500).send({ error: error || stderr })
      }
      if (!stdout.length) return reply.status(204).send({ peers: [] })
      const peers = stdout.split("\n").map(peer => {
        const [pubkey, allowedips] = peer.split("\t")
        return { pubkey, allowedips: allowedips.split(" ") }
      })
      reply.status(200).send({ peers })
    });
  });
  fastify.get("/:iface/latestHandshake", async function (req, reply) {
    const { iface } = req.params
    const command = `wg show ${iface} allowed-ips`
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        return reply.status(500).send({ error: error || stderr })
      }
      if (!stdout.length) return reply.status(204).send({ peers: [] })
      const peers = stdout.split("\n").map(peer => {
        const [pubkey, handshake] = peer.split("\t")
        return { pubkey, latestHandshake: handshake }
      })
      reply.status(200).send({ peers })
    });
  });
}