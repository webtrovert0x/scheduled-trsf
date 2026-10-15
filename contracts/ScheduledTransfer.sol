// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal interface for ERC20 token transfers
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
}

/**
 * @dev SafeERC20 wrapper around ERC20 operations that throw on failure
 */
library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transfer failed");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transferFrom.selector, from, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transferFrom failed");
    }
}

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 */
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @title ScheduledTransfer
 * @notice Prepare transfers that become executable at a future release time on BotChain.
 * Supports native BOT (gas token) and ERC20 tokens.
 * Features:
 * - Escrow locking upon schedule
 * - Configurable keeper execution reward (in native BOT) for automated trigger callers
 * - Cancellation and full refund for sender before execution
 * - Single and batch execution
 * - Rich query views for frontend display
 */
contract ScheduledTransfer is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // address(0) represents the native BOT gas coin
    address public constant NATIVE_TOKEN = address(0);

    enum Status {
        Pending,
        Executed,
        Cancelled
    }

    struct Transfer {
        uint256 id;
        address sender;
        address recipient;
        address token; // address(0) for native BOT, or ERC-20 token address
        uint256 amount;
        uint256 releaseTime;
        uint256 keeperReward; // Native BOT reward granted to the caller who triggers execution
        Status status;
        string note; // Optional memo/description (e.g. "Monthly Payroll", "Invoice #104")
        uint256 createdAt;
        uint256 executedAt;
    }

    // Incremental transfer counter
    uint256 private _nextTransferId = 1;

    // Mapping from transfer ID to Transfer struct
    mapping(uint256 => Transfer) private _transfers;

    // Index mappings for quick queries
    mapping(address => uint256[]) private _senderTransfers;
    mapping(address => uint256[]) private _recipientTransfers;
    uint256[] private _allTransferIds;

    // Events
    event TransferScheduled(
        uint256 indexed id,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 releaseTime,
        uint256 keeperReward,
        string note
    );

    event TransferExecuted(
        uint256 indexed id,
        address indexed recipient,
        address indexed caller,
        address token,
        uint256 amount,
        uint256 keeperReward
    );

    event TransferCancelled(
        uint256 indexed id,
        address indexed sender,
        address token,
        uint256 refundAmount,
        uint256 refundReward
    );

    /**
     * @notice Schedule a future transfer of native BOT coins.
     * @param recipient Target address to receive funds.
     * @param amount Amount of native BOT to transfer to recipient.
     * @param releaseTime Timestamp after which the transfer can be executed.
     * @param keeperReward Optional incentive in native BOT paid to whoever executes the transfer.
     * @param note Memo/description for tracking.
     */
    function scheduleNativeTransfer(
        address recipient,
        uint256 amount,
        uint256 releaseTime,
        uint256 keeperReward,
        string calldata note
    ) external payable nonReentrant returns (uint256 transferId) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(releaseTime > block.timestamp, "Release time must be in future");
        require(msg.value == amount + keeperReward, "msg.value must equal amount + keeperReward");

        transferId = _createTransfer(
            msg.sender,
            recipient,
            NATIVE_TOKEN,
            amount,
            releaseTime,
            keeperReward,
            note
        );
    }

    /**
     * @notice Schedule a future transfer of ERC20 tokens.
     * @param token Address of the ERC20 token contract.
     * @param recipient Target address to receive funds.
     * @param amount Amount of tokens to transfer.
     * @param releaseTime Timestamp after which the transfer can be executed.
     * @param keeperReward Optional native BOT reward attached (passed in msg.value).
     * @param note Memo/description for tracking.
     */
    function scheduleTokenTransfer(
        address token,
        address recipient,
        uint256 amount,
        uint256 releaseTime,
        uint256 keeperReward,
        string calldata note
    ) external payable nonReentrant returns (uint256 transferId) {
        require(token != address(0), "Use scheduleNativeTransfer for native BOT");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(releaseTime > block.timestamp, "Release time must be in future");
        require(msg.value == keeperReward, "msg.value must equal keeperReward");

        // Escrow ERC20 tokens into this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        transferId = _createTransfer(
            msg.sender,
            recipient,
            token,
            amount,
            releaseTime,
            keeperReward,
            note
        );
    }

    /**
     * @dev Internal helper to record transfer state and emit event.
     */
    function _createTransfer(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        uint256 releaseTime,
        uint256 keeperReward,
        string memory note
    ) internal returns (uint256 transferId) {
        transferId = _nextTransferId++;

        _transfers[transferId] = Transfer({
            id: transferId,
            sender: sender,
            recipient: recipient,
            token: token,
            amount: amount,
            releaseTime: releaseTime,
            keeperReward: keeperReward,
            status: Status.Pending,
            note: note,
            createdAt: block.timestamp,
            executedAt: 0
        });

        _senderTransfers[sender].push(transferId);
        _recipientTransfers[recipient].push(transferId);
        _allTransferIds.push(transferId);

        emit TransferScheduled(
            transferId,
            sender,
            recipient,
            token,
            amount,
            releaseTime,
            keeperReward,
            note
        );
    }

    /**
     * @notice Execute a single scheduled transfer that has reached its release time.
     * Callable by anyone (recipient, sender, or automation keeper).
     * @param transferId ID of the transfer to execute.
     */
    function executeTransfer(uint256 transferId) public nonReentrant {
        _execute(transferId);
    }

    /**
     * @notice Execute a batch of scheduled transfers in a single transaction.
     * @param transferIds Array of transfer IDs to execute.
     */
    function executeBatch(uint256[] calldata transferIds) external nonReentrant {
        for (uint256 i = 0; i < transferIds.length; i++) {
            _execute(transferIds[i]);
        }
    }

    /**
     * @dev Internal execution logic with state update before funds disbursement.
     */
    function _execute(uint256 transferId) internal {
        Transfer storage t = _transfers[transferId];
        require(t.id != 0, "Transfer does not exist");
        require(t.status == Status.Pending, "Transfer not pending");
        require(block.timestamp >= t.releaseTime, "Release time not reached");

        t.status = Status.Executed;
        t.executedAt = block.timestamp;

        // Disburse main transfer funds
        if (t.token == NATIVE_TOKEN) {
            (bool success, ) = payable(t.recipient).call{value: t.amount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20(t.token).safeTransfer(t.recipient, t.amount);
        }

        // Disburse keeper reward in native BOT if set
        if (t.keeperReward > 0) {
            (bool rewardSuccess, ) = payable(msg.sender).call{value: t.keeperReward}("");
            require(rewardSuccess, "Reward transfer failed");
        }

        emit TransferExecuted(
            transferId,
            t.recipient,
            msg.sender,
            t.token,
            t.amount,
            t.keeperReward
        );
    }

    /**
     * @notice Cancel a pending transfer and refund locked assets to the sender.
     * Can only be called by the transfer's creator before execution.
     * @param transferId ID of the transfer to cancel.
     */
    function cancelTransfer(uint256 transferId) external nonReentrant {
        Transfer storage t = _transfers[transferId];
        require(t.id != 0, "Transfer does not exist");
        require(msg.sender == t.sender, "Only sender can cancel");
        require(t.status == Status.Pending, "Transfer not pending");

        t.status = Status.Cancelled;

        // Refund main asset
        if (t.token == NATIVE_TOKEN) {
            uint256 totalRefund = t.amount + t.keeperReward;
            (bool success, ) = payable(t.sender).call{value: totalRefund}("");
            require(success, "Native refund failed");
        } else {
            IERC20(t.token).safeTransfer(t.sender, t.amount);
            if (t.keeperReward > 0) {
                (bool rewardSuccess, ) = payable(t.sender).call{value: t.keeperReward}("");
                require(rewardSuccess, "Reward refund failed");
            }
        }

        emit TransferCancelled(
            transferId,
            t.sender,
            t.token,
            t.amount,
            t.keeperReward
        );
    }

    // ==========================================
    //              VIEW FUNCTIONS
    // ==========================================

    function getTransfer(uint256 transferId) external view returns (Transfer memory) {
        require(_transfers[transferId].id != 0, "Transfer does not exist");
        return _transfers[transferId];
    }

    function totalTransfers() external view returns (uint256) {
        return _allTransferIds.length;
    }

    function getSenderTransferIds(address sender) external view returns (uint256[] memory) {
        return _senderTransfers[sender];
    }

    function getRecipientTransferIds(address recipient) external view returns (uint256[] memory) {
        return _recipientTransfers[recipient];
    }

    function getAllTransferIds() external view returns (uint256[] memory) {
        return _allTransferIds;
    }

    /**
     * @notice Fetch an array of transfers by IDs.
     */
    function getTransfersByIds(uint256[] calldata ids) external view returns (Transfer[] memory result) {
        result = new Transfer[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _transfers[ids[i]];
        }
    }

    /**
     * @notice Paginated retrieval of transfers with total count.
     */
    function getTransfersPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (Transfer[] memory items, uint256 total)
    {
        total = _allTransferIds.length;
        if (offset >= total) {
            return (new Transfer[](0), total);
        }

        uint256 to = offset + limit;
        if (to > total) {
            to = total;
        }

        uint256 count = to - offset;
        items = new Transfer[](count);
        for (uint256 i = 0; i < count; i++) {
            items[i] = _transfers[_allTransferIds[offset + i]];
        }
    }

    // Allow contract to receive native BOT when needed
    receive() external payable {}
}
