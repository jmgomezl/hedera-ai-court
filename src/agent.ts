import { HederaAgentAPI } from "@hashgraph/hedera-agent-kit";
import type { Context } from "@hashgraph/hedera-agent-kit";
import { Client, PrivateKey, AccountId } from "@hiero-ledger/sdk";
import { courtPlugin } from "./plugins/courtPlugin.js";

export type CourtAgent = {
  api: HederaAgentAPI;
  client: Client;
  network: string;
};

export function createCourtAgent(
  accountId: string,
  privateKey: string,
  network: string,
  googleApiKey: string
): CourtAgent {
  const client =
    network === "mainnet"
      ? Client.forMainnet()
      : Client.forTestnet();

  const normalizedKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  const pk = normalizedKey.startsWith("302")
    ? PrivateKey.fromStringDer(normalizedKey)
    : PrivateKey.fromStringECDSA(normalizedKey);
  client.setOperator(AccountId.fromString(accountId), pk);

  const context: Context = {
    accountId,
  };

  const plugin = courtPlugin(googleApiKey, network);
  const tools = plugin.tools(context);

  const api = new HederaAgentAPI(client, context, tools);

  return { api, client, network };
}
