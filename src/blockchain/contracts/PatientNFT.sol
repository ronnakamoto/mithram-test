// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PatientNFT
 * @dev ERC721 token representing patient data with role-based access control
 */
contract PatientNFT is ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    
    uint256 private _nextTokenId;
    
    // Mapping from token ID to metadata hash
    mapping(uint256 => bytes32) private _metadataHashes;
    
    // Mapping from patient ID to token ID
    mapping(string => uint256) private _patientTokens;
    
    // Mapping to track which patient IDs exist
    mapping(string => bool) private _patientExists;
    
    // Mapping from analysis ID to token ID
    mapping(string => uint256) private _analysisTokens;
    
    // Mapping to track which analysis IDs exist
    mapping(string => bool) private _analysisExists;
    
    event MetadataUpdated(uint256 indexed tokenId, bytes32 newHash);
    event PatientTokenMinted(string patientId, uint256 tokenId);

    constructor() ERC721("PatientNFT", "PNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }

    /**
     * @dev Mints a new token for a patient
     * @param to The address that will own the minted token
     * @param patientId Unique identifier for the patient
     * @param analysisId Unique identifier for the analysis
     * @param uri URI for the token metadata
     * @param metadataHash Hash of the metadata content
     */
    function safeMint(
        address to,
        string memory patientId,
        string memory analysisId,
        string memory uri,
        bytes32 metadataHash
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        require(!_patientExists[patientId], "PatientNFT: Patient already has a token");
        require(!_analysisExists[analysisId], "PatientNFT: Analysis already has a token");
        require(bytes(analysisId).length > 0, "PatientNFT: Analysis ID cannot be empty");
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _metadataHashes[tokenId] = metadataHash;
        _patientTokens[patientId] = tokenId;
        _patientExists[patientId] = true;
        
        // Store analysis ID mapping
        _analysisTokens[analysisId] = tokenId;
        _analysisExists[analysisId] = true;
        
        emit PatientTokenMinted(patientId, tokenId);
        return tokenId;
    }

    /**
     * @dev Updates the metadata URI and hash for a token
     * @param tokenId The ID of the token to update
     * @param newUri New URI for the token metadata
     * @param newHash New hash of the metadata content
     */
    function updateMetadata(
        uint256 tokenId,
        string memory newUri,
        bytes32 newHash
    ) public onlyRole(UPDATER_ROLE) {
        require(_exists(tokenId), "PatientNFT: Token does not exist");
        
        _setTokenURI(tokenId, newUri);
        _metadataHashes[tokenId] = newHash;
        
        emit MetadataUpdated(tokenId, newHash);
    }

    /**
     * @dev Gets the token ID for a patient
     * @param patientId The patient's unique identifier
     * @return The token ID associated with the patient
     */
    function getTokenByPatient(string memory patientId) public view returns (uint256) {
        require(_patientExists[patientId], "PatientNFT: Patient not found");
        return _patientTokens[patientId];
    }

    /**
     * @dev Gets the token ID for an analysis
     * @param analysisId The analysis unique identifier
     * @return The token ID associated with the analysis
     */
    function getTokenByAnalysis(string memory analysisId) public view returns (uint256) {
        require(_analysisExists[analysisId], "PatientNFT: Analysis not found");
        return _analysisTokens[analysisId];
    }

    /**
     * @dev Gets the metadata hash for a token
     * @param tokenId The ID of the token
     * @return The metadata hash
     */
    function getMetadataHash(uint256 tokenId) public view returns (bytes32) {
        require(_exists(tokenId), "PatientNFT: Token does not exist");
        return _metadataHashes[tokenId];
    }

    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
