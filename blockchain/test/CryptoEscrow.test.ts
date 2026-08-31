import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("CryptoEscrow", function () {
  let token: any;
  let escrow: any;
  let owner: any;
  let payer: any;
  let payee: any;

  async function deployFixture() {
    [owner, payer, payee] = await ethers.getSigners();
    // GlobexUSD is retained only as a local ERC-20 test double. It is not
    // deployed by the Sepolia deployment script or used by the application.
    token = await ethers.deployContract("GlobexUSD");
    escrow = await ethers.deployContract("CryptoEscrow");
    await token.mint(payer.address, ethers.parseEther("10000"));
    return { token, escrow, owner, payer, payee };
  }

  beforeEach(async () => {
    ({ token, escrow, owner, payer, payee } = await networkHelpers.loadFixture(deployFixture));
  });

  it("supports native ETH deposits and release", async () => {
    const amount = ethers.parseEther("1");
    await escrow.createEscrow("eth-trade", payer.address, payee.address, 0, ethers.ZeroAddress, amount);
    await expect(escrow.connect(payer).depositNative("eth-trade", { value: amount }))
      .to.emit(escrow, "EscrowFunded");
    const before = await ethers.provider.getBalance(payee.address);
    await escrow.release("eth-trade");
    expect((await ethers.provider.getBalance(payee.address)) - before).to.equal(amount);
    expect((await escrow.getEscrow("eth-trade")).status).to.equal(2);
  });

  it("supports ERC-20 deposits and release", async () => {
    const amount = ethers.parseUnits("100", 18);
    await escrow.createEscrow("usdc-trade", payer.address, payee.address, 1, await token.getAddress(), amount);
    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).deposit("usdc-trade", amount);
    const before = await token.balanceOf(payee.address);
    await escrow.release("usdc-trade");
    expect((await token.balanceOf(payee.address)) - before).to.equal(amount);
  });

  it("refunds and prevents settlement while disputed", async () => {
    const amount = ethers.parseUnits("50", 18);
    await escrow.createEscrow("refund-trade", payer.address, payee.address, 1, await token.getAddress(), amount);
    await token.connect(payer).approve(await escrow.getAddress(), amount);
    await escrow.connect(payer).deposit("refund-trade", amount);
    await escrow.raiseDispute("refund-trade");
    await expect(escrow.refund("refund-trade")).to.emit(escrow, "EscrowRefunded");
    expect((await escrow.getEscrow("refund-trade")).status).to.equal(3);
    await expect(escrow.refund("refund-trade")).to.be.revertedWith("Escrow is not settleable");
  });
});