import { os_func } from "./wireguard";

const os = new os_func();

export const flushPeers = async (iface: string, configs: Map<string, any>) => {
  const command = `wg show ${iface} peers`
  const peers = await os.execCommand(command)
    .then((stdout) =>
      stdout
        .split("\n")
        .filter(line => line.length)
    )
    .catch((error) => {
      console.error(error);
    }
  );
  // remove map entries not in wg interface
  for (const peer of configs.keys()) {
    if (peers.includes(peer)) continue;
    configs.delete(peer);
    console.log("Flushed Peer: " + peer)
  }

  for (const peer of peers) {
    if (!configs.has(peer) || configs.get(peer).expiry >= new Date().getTime) {
      const command = `wg set ${iface} peer ${peer} remove`;
      await os.execCommand(command)
        .catch((error) => {
          console.error(error);
        }
      );
      configs.delete(peer);
      console.log("Flushed Peer: " + peer)
    }
  }
}