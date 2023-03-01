import { exec } from "child_process";
import { auth, allowed_ifaces } from "./config.json"

function os_func() {
  this.execCommand = function(cmd, callback) {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      callback(stdout);
    });
  }
}
var os = new os_func();

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
    return await os.execCommand(command)
      .then((stdout) => {
        reply.code(200).send({ message: "Peer removed" })
      })
      .catch((error) => {
        reply.code(500).send({ error: error })
      });
  });
  fastify.post("/:iface", async function (req, reply) {
    const { pubkey, allowedips } = req.body
    const { iface } = req.params
    const command = `wg set ${iface} peer ${pubkey} allowed-ips ${allowedips}`
    return await os.execCommand(command)
      .then((stdout) => {
        reply.code(201).send({ message: "Peer added" })
      })
      .catch((error) => {
        reply.code(500).send({ error: error })
      });
  });
  fastify.get("/:iface/ips", async function (req, reply) {
    const { iface } = req.params
    const command = `wg show ${iface} allowed-ips`
    return await os.execCommand(command)
      .then((stdout) => {
        if (!stdout) return reply.code(204).send({ peers: [] })
        const peers = stdout
        .split("\n")
        .filter(peer => peer.length)
        .map(peer => {
          const [pubkey, allowedips] = peer.split("\t")
          const ips = allowedips.split(" ")
          return { pubkey, allowedips: ips }
        })
        return reply.code(200).send({ peers })
      })
      .catch((error) => {
        reply.code(500).send({ error: error })
      });
  });
  fastify.get("/:iface/handshake", async function (req, reply) {
    const { iface } = req.params
    const command = `wg show ${iface} latest-handshakes`
    return await os.execCommand(command)
      .then((stdout) => {
        if (!stdout) return reply.code(204).send({ peers: [] })
        const peers = stdout
        .split("\n")
        .filter(peer => peer.length)
        .map(peer => {
          const [pubkey, handshake] = peer.split("\t")
          return { pubkey, latestHandshake: handshake }
        })
        return reply.code(200).send({ peers })
      })
      .catch((error) => {
        reply.code(500).send({ error: error })
      });
  });
}