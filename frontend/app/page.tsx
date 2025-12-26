"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, Shield, Users, Plus, Trash2,
    CheckCircle, XCircle, ChevronRight, Activity, Clock, AlertCircle, TrendingUp
} from 'lucide-react';

import SafeClubArtifact from '../utils/SafeClub.json';
import ContractAddress from '../utils/contract-address.json';

const SafeClubAddress = ContractAddress.SafeClub;

// Updated for Light Mode: Solid white with soft shadows
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white border border-slate-200 shadow-sm rounded-2xl p-6 ${className}`}
    >
        {children}
    </motion.div>
);

export default function Home() {
    const [provider, setProvider] = useState<any>(null);
    const [signer, setSigner] = useState<any>(null);
    const [contract, setContract] = useState<any>(null);
    const [account, setAccount] = useState<string>('');
    const [owner, setOwner] = useState<string>('');
    const [isOwner, setIsOwner] = useState(false);
    const [balance, setBalance] = useState('0');
    const [members, setMembers] = useState<string[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form states
    const [newMember, setNewMember] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [propTo, setPropTo] = useState('');
    const [propAmount, setPropAmount] = useState('');
    const [propDesc, setPropDesc] = useState('');
    const [propDeadline, setPropDeadline] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        if (window.ethereum) {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(browserProvider);
        }
        const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(timer);
    }, []);

    const getReadableError = (error: any) => {
        if (error.reason) return error.reason;
        if (error.code === "ACTION_REJECTED") return "Transaction rejected.";
        return "Unknown error occurred.";
    };

    const connectWallet = async () => {
        if (!provider) return alert("Please install MetaMask.");
        try {
            const accounts = await provider.send("eth_requestAccounts", []);
            setAccount(accounts[0]);
            const signer = await provider.getSigner();
            setSigner(signer);
            const safeClub = new ethers.Contract(SafeClubAddress, SafeClubArtifact, signer);
            setContract(safeClub);
            const ownerAddr = await safeClub.owner();
            setOwner(ownerAddr);
            setIsOwner(ownerAddr.toLowerCase() === accounts[0].toLowerCase());
            updateData(safeClub);
        } catch (err: any) { alert(getReadableError(err)); }
    };

    const updateData = async (safeClub: any) => {
        try {
            const bal = await safeClub.getBalance();
            setBalance(ethers.formatEther(bal));
            const loadedMembers = [];
            let i = 0;
            while (true) {
                try {
                    const addr = await safeClub.memberList(i);
                    const memberInfo = await safeClub.members(addr);
                    if (memberInfo.isMember) loadedMembers.push(addr);
                    i++;
                } catch (e) { break; }
            }
            setMembers(loadedMembers);
            const count = await safeClub.proposalCount();
            const loadedProposals = [];
            for (let i = 0; i < count; i++) {
                const p = await safeClub.proposals(i);
                loadedProposals.push({
                    id: i, to: p.to, amount: ethers.formatEther(p.amount),
                    description: p.description, deadlineRaw: Number(p.deadline) * 1000,
                    deadline: new Date(Number(p.deadline) * 1000).toLocaleString(),
                    votesFor: p.votesFor.toString(), votesAgainst: p.votesAgainst.toString(),
                    executed: p.executed
                });
            }
            setProposals(loadedProposals);
        } catch (err) { console.error(err); }
    };

    const withLoading = async (fn: () => Promise<void>) => {
        setLoading(true);
        try { await fn(); } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleDeposit = () => withLoading(async () => {
        if (!contract || !depositAmount) return;
        const tx = await signer.sendTransaction({ to: SafeClubAddress, value: ethers.parseEther(depositAmount) });
        await tx.wait();
        setDepositAmount('');
        updateData(contract);
    });

    const handleAddMember = () => withLoading(async () => {
        if (!contract || !newMember) return;
        const tx = await contract.addMember(newMember);
        await tx.wait();
        setNewMember('');
        updateData(contract);
    });

    const handleRemoveMember = (addr: string) => withLoading(async () => {
        const tx = await contract.removeMember(addr);
        await tx.wait();
        updateData(contract);
    });

    const handleCreateProposal = () => withLoading(async () => {
        const targetDate = new Date(propDeadline).getTime();
        const ts = Math.floor(targetDate / 1000);
        const tx = await contract.createProposal(propTo, ethers.parseEther(propAmount), propDesc, ts);
        await tx.wait();
        setPropTo(''); setPropAmount(''); setPropDesc(''); setPropDeadline('');
        updateData(contract);
    });

    const handleVote = (id: number, support: boolean) => withLoading(async () => {
        const tx = await contract.vote(id, support);
        await tx.wait();
        updateData(contract);
    });

    const handleExecute = (id: number) => withLoading(async () => {
        const tx = await contract.executeProposal(id);
        await tx.wait();
        updateData(contract);
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-600 rounded-lg">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">SafeClub</span>
                    </div>

                    {!account ? (
                        <button onClick={connectWallet} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full font-medium transition-all flex items-center gap-2 text-sm shadow-sm shadow-indigo-200">
                            <Wallet className="w-4 h-4" /> Connect Wallet
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-mono text-xs font-semibold text-slate-600">{account.substring(0, 6)}...{account.substring(38)}</span>
                        </div>
                    )}
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {account ? (
                    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* LEFT COLUMN: Treasury & Management */}
                        <div className="lg:col-span-4 space-y-6">
                            <GlassCard className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-indigo-200 shadow-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Treasury Balance</p>
                                    <TrendingUp className="w-5 h-5 text-indigo-200" />
                                </div>
                                <div className="text-4xl font-bold mb-6 flex items-baseline gap-2">
                                    {balance} <span className="text-lg font-medium text-indigo-200">ETH</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 w-full text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                    />
                                    <button onClick={handleDeposit} className="bg-white text-indigo-600 p-2.5 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </GlassCard>

                            {isOwner && (
                                <GlassCard>
                                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                                        <Users className="w-4 h-4 text-indigo-600" />
                                        <h2 className="text-sm font-bold uppercase tracking-wider">Members</h2>
                                    </div>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" placeholder="0x..." className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" value={newMember} onChange={(e) => setNewMember(e.target.value)} />
                                        <button onClick={handleAddMember} className="bg-slate-900 text-white px-3 rounded-xl hover:bg-slate-800 transition-colors"><Plus className="w-4 h-4" /></button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {members.map((member, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                                <span className="font-mono text-[11px] text-slate-500">{member}</span>
                                                <button onClick={() => handleRemoveMember(member)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            )}

                            <GlassCard>
                                <div className="flex items-center gap-2 mb-4 text-slate-800">
                                    <Activity className="w-4 h-4 text-amber-500" />
                                    <h2 className="text-sm font-bold uppercase tracking-wider">New Proposal</h2>
                                </div>
                                <div className="space-y-3">
                                    <input type="text" placeholder="Recipient 0x..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500" value={propTo} onChange={e => setPropTo(e.target.value)} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" placeholder="ETH" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500" value={propAmount} onChange={e => setPropAmount(e.target.value)} />
                                        <input type="datetime-local" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none text-slate-500 focus:border-indigo-500" value={propDeadline} onChange={e => setPropDeadline(e.target.value)} />
                                    </div>
                                    <textarea placeholder="Purpose..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 h-20" value={propDesc} onChange={e => setPropDesc(e.target.value)} />
                                    <button onClick={handleCreateProposal} className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg transition-all">Submit to Vote</button>
                                </div>
                            </GlassCard>
                        </div>

                        {/* RIGHT COLUMN: Feed */}
                        <div className="lg:col-span-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-3">
                                    Active Governance
                                    <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{proposals.length}</span>
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <AnimatePresence>
                                    {proposals.map((p) => {
                                        const isExpired = currentTime > p.deadlineRaw;
                                        const hasPassed = Number(p.votesFor) > Number(p.votesAgainst);

                                        return (
                                            <motion.div
                                                key={p.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`bg-white border ${p.executed ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-200'} rounded-2xl p-6 shadow-sm`}
                                            >
                                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <span className="text-xs font-bold text-slate-400">PROP-{p.id}</span>
                                                            <h4 className="text-lg font-bold text-slate-800">{p.description}</h4>
                                                        </div>

                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Grant</p>
                                                                <p className="text-sm font-semibold text-indigo-600">{p.amount} ETH</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Target</p>
                                                                <p className="text-sm font-mono text-slate-600">{p.to.substring(0,6)}...{p.to.substring(38)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Ends</p>
                                                                <p className={`text-sm font-medium ${isExpired ? 'text-red-500' : 'text-slate-600'}`}>{p.deadline.split(',')[0]}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                                                                <span className="text-emerald-600">Yes: {p.votesFor}</span>
                                                                <span className="text-rose-500">No: {p.votesAgainst}</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                                                <div style={{width: `${(Number(p.votesFor) / (Number(p.votesFor) + Number(p.votesAgainst) || 1)) * 100}%`}} className="bg-emerald-500 transition-all duration-500" />
                                                                <div style={{width: `${(Number(p.votesAgainst) / (Number(p.votesFor) + Number(p.votesAgainst) || 1)) * 100}%`}} className="bg-rose-500 transition-all duration-500" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex md:flex-col justify-center gap-2 min-w-[140px]">
                                                        {p.executed ? (
                                                            <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 w-full">
                                                                <CheckCircle className="w-5 h-5 mb-1" />
                                                                <span className="text-xs font-bold uppercase">Settled</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {!isExpired ? (
                                                                    <>
                                                                        <button onClick={() => handleVote(p.id, true)} className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                                                                            <CheckCircle className="w-4 h-4" /> Approve
                                                                        </button>
                                                                        <button onClick={() => handleVote(p.id, false)} className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 text-sm font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2">
                                                                            <XCircle className="w-4 h-4" /> Reject
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    hasPassed ? (
                                                                        <button onClick={() => handleExecute(p.id)} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all">
                                                                            Execute
                                                                        </button>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 w-full">
                                                                            <AlertCircle className="w-5 h-5 mb-1" />
                                                                            <span className="text-xs font-bold uppercase">Failed</span>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                {proposals.length === 0 && (
                                    <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                                        No proposals found. Be the first to start a vote!
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
                            <Shield className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Governance made simple.</h2>
                        <p className="text-slate-500 max-w-md mb-8">Connect your wallet to manage treasury funds and vote on community-driven proposals.</p>
                        <button onClick={connectWallet} className="bg-slate-900 text-white px-10 py-4 rounded-full font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-3">
                            <Wallet className="w-5 h-5" /> Get Started
                        </button>
                    </div>
                )}
            </div>

            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-slate-100">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-slate-900 font-bold">Processing Transaction...</p>
                        <p className="text-slate-400 text-xs mt-1">Please confirm in your wallet</p>
                    </div>
                </div>
            )}
        </div>
    );
}