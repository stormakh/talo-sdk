import { TaloHttpClient } from "../core/http";
import { faucetRequestSchema, faucetResponseSchema, identifierSchema } from "../schemas";
import type { SimulateFaucetRequest, SimulateFaucetResponse } from "../types";

export class SandboxResource {
  constructor(private readonly httpClient: TaloHttpClient) {}

  /**
   * Simulate an incoming transfer to a CVU in sandbox mode.
   */
  async simulateCvuTransfer(
    cvu: string,
    input: SimulateFaucetRequest,
  ): Promise<SimulateFaucetResponse> {
    const parsedCvu = identifierSchema.parse(cvu);

    return this.httpClient.request({
      method: "POST",
      path: `/cvu/${parsedCvu}/faucet`,
      body: input,
      requestSchema: faucetRequestSchema,
      responseSchema: faucetResponseSchema,
    });
  }
}
