const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SafeClub", function () {
    let safeClub;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        const SafeClubFactory = await ethers.getContractFactory("SafeClub");
        safeClub = await SafeClubFactory.deploy();
        // await safeClub.deployed(); // In ethers v6, deploy() returns the contract instance, might need waitForDeployment()
    });

    describe("Membership", function () {
        it("Should set the right owner", async function () {
            expect(await safeClub.owner()).to.equal(owner.address);
        });

        it("Owner should be a member", async function () {
            const member = await safeClub.members(owner.address);
            expect(member.isMember).to.equal(true);
        });

        it("Should allow owner to add member", async function () {
            await safeClub.addMember(addr1.address);
            const member = await safeClub.members(addr1.address);
            expect(member.isMember).to.equal(true);
        });

        it("Should not allow non-owner to add member", async function () {
            // Ethers v6 uses expect(tx).to.be.revertedWith...
            await expect(
                safeClub.connect(addr1).addMember(addr2.address)
            ).to.be.reverted;
            // Specific error checking depends on Ownable implementation
        });
    });

    describe("Transactions", function () {
        it("Should receive ETH", async function () {
            await owner.sendTransaction({
                to: await safeClub.getAddress(),
                value: ethers.parseEther("1.0"), // v6 syntax
            });
            const balance = await ethers.provider.getBalance(await safeClub.getAddress());
            expect(balance).to.equal(ethers.parseEther("1.0"));
        });
    });

    describe("Proposals", function () {
        beforeEach(async function () {
            // Fund the club
            await owner.sendTransaction({
                to: await safeClub.getAddress(),
                value: ethers.parseEther("10.0"),
            });
            await safeClub.addMember(addr1.address);
            await safeClub.addMember(addr2.address);
        });

        it("Should allow member to create proposal", async function () {
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            await safeClub.connect(addr1).createProposal(addr2.address, ethers.parseEther("1.0"), "Pay addr2", deadline);
            const proposal = await safeClub.proposals(0);
            expect(proposal.description).to.equal("Pay addr2");
            expect(proposal.executed).to.equal(false);
        });

        it("Should allow voting", async function () {
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            await safeClub.connect(addr1).createProposal(addr2.address, ethers.parseEther("1.0"), "Pay addr2", deadline);

            await safeClub.connect(addr1).vote(0, true);
            const proposal = await safeClub.proposals(0);
            expect(proposal.votesFor).to.equal(1);
        });

        it("Should execute proposal after deadline if approved", async function () {

            const deadline = (await ethers.provider.getBlock('latest')).timestamp + 3600;
            await safeClub.connect(addr1).createProposal(addr2.address, ethers.parseEther("1.0"), "Pay addr2", deadline);

            await safeClub.connect(addr1).vote(0, true);
            await safeClub.vote(0, true);

            await ethers.provider.send("evm_increaseTime", [3601]);
            await ethers.provider.send("evm_mine");

            await safeClub.executeProposal(0);
            const proposal = await safeClub.proposals(0);
            expect(proposal.executed).to.equal(true);
        });
    });
});
