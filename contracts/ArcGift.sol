// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// arc-gift: fund a USDC gift card with a message, share a link + optional secret code, recipient claims it.
contract ArcGift {
    struct Gift { address from; uint256 amount; string message; bytes32 codeHash; bool hasCode; bool claimed; address claimer; }
    Gift[] public gifts;
    mapping(address => uint256[]) private created;
    uint256 public totalGifted;
    event Created(uint256 indexed id, address indexed from, uint256 amount);
    event Claimed(uint256 indexed id, address indexed to, uint256 amount);

    function create(string calldata message, bytes32 codeHash, bool hasCode) external payable returns (uint256 id) {
        require(msg.value > 0, "Zero");
        id = gifts.length;
        gifts.push(Gift(msg.sender, msg.value, message, codeHash, hasCode, false, address(0)));
        created[msg.sender].push(id);
        totalGifted += msg.value;
        emit Created(id, msg.sender, msg.value);
    }
    function claim(uint256 id, string calldata code) external {
        Gift storage g = gifts[id];
        require(!g.claimed, "Claimed");
        if (g.hasCode) require(keccak256(bytes(code)) == g.codeHash, "Bad code");
        g.claimed = true; g.claimer = msg.sender;
        (bool ok,) = payable(msg.sender).call{value: g.amount}(""); require(ok, "fail");
        emit Claimed(id, msg.sender, g.amount);
    }
    function reclaim(uint256 id) external {
        Gift storage g = gifts[id];
        require(msg.sender == g.from && !g.claimed, "Cannot");
        g.claimed = true; g.claimer = g.from;
        (bool ok,) = payable(g.from).call{value: g.amount}(""); require(ok, "fail");
    }
    function get(uint256 id) external view returns (Gift memory) { return gifts[id]; }
    function getCreated(address u) external view returns (uint256[] memory) { return created[u]; }
    function total() external view returns (uint256) { return gifts.length; }
}
