use anchor_lang::prelude::*;
use inco_lightning::cpi::accounts::{Allow, Operation};
use inco_lightning::cpi::{allow, new_euint128};
use inco_lightning::types::Euint128;
use inco_lightning::ID as INCO_LIGHTNING_ID;

declare_id!("2TRoeeuqTXtfv4vP5weiHRB9vyRcGsWPmJT7tiYrvQoT");

/// Maximum number of encrypted KYC fields we store per identity.
const KYC_FIELD_COUNT: usize = 6;

#[program]
pub mod confidential_kyc {
    use super::*;

    /// Initialize a new KYC record PDA for the caller.
    /// The PDA is derived from ["kyc", authority.key()].
    pub fn initialize_kyc(ctx: Context<InitializeKyc>) -> Result<()> {
        let kyc = &mut ctx.accounts.kyc_account;
        kyc.owner = ctx.accounts.authority.key();
        kyc.is_verified = false;
        kyc.submitted_at = Clock::get()?.unix_timestamp;
        kyc.field_count = 0;
        msg!("KYC account initialized for {}", kyc.owner);
        Ok(())
    }

    /// Submit an encrypted KYC field.
    ///
    /// `ciphertext` — the client-side encrypted value from `encryptValue()`.
    /// `field_index` — which field (0=name, 1=dob, 2=nationality, 3=doc_type, 4=doc_number, 5=address).
    ///
    /// The instruction:
    /// 1. Calls `new_euint128` on Inco Lightning to register the ciphertext and get an encrypted handle.
    /// 2. Stores the handle in the KYC account.
    /// 3. Calls `allow` to grant decryption access to the owner.
    ///
    /// remaining_accounts:
    ///   [0] allowance_account (mut) — PDA for the allow CPI
    ///   [1] owner_address (readonly) — the owner to grant access to
    pub fn submit_field<'info>(
        ctx: Context<'_, '_, '_, 'info, SubmitField<'info>>,
        ciphertext: Vec<u8>,
        field_index: u8,
    ) -> Result<()> {
        require!(
            (field_index as usize) < KYC_FIELD_COUNT,
            KycError::InvalidFieldIndex
        );

        let kyc = &mut ctx.accounts.kyc_account;
        require!(kyc.owner == ctx.accounts.authority.key(), KycError::Unauthorized);

        let inco = ctx.accounts.inco_lightning_program.to_account_info();
        let signer = ctx.accounts.authority.to_account_info();

        // 1. Register ciphertext with Inco Lightning → get encrypted handle
        let cpi_ctx = CpiContext::new(inco.clone(), Operation { signer: signer.clone() });
        let handle: Euint128 = new_euint128(cpi_ctx, ciphertext, 0)?;

        msg!(
            "Field {} encrypted handle: {}",
            field_index,
            handle.0
        );

        // 2. Store handle in the KYC account
        kyc.fields[field_index as usize] = handle.0;

        // Track how many fields have been submitted
        let filled = kyc.fields.iter().filter(|h| **h != 0).count();
        kyc.field_count = filled as u8;

        // 3. Grant decryption access to the owner via remaining_accounts
        if ctx.remaining_accounts.len() >= 2 {
            let allowance_account = &ctx.remaining_accounts[0];
            let allowed_address = &ctx.remaining_accounts[1];

            let cpi_ctx = CpiContext::new(
                inco.clone(),
                Allow {
                    allowance_account: allowance_account.clone(),
                    signer: signer.clone(),
                    allowed_address: allowed_address.clone(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            );
            allow(cpi_ctx, handle.0, true, kyc.owner)?;
            msg!("Decrypt access granted to owner for field {}", field_index);
        }

        Ok(())
    }

    /// Grant a verifier decryption access to a specific field.
    ///
    /// Only the KYC owner can call this.
    ///
    /// remaining_accounts:
    ///   [0] allowance_account (mut) — PDA for the allow CPI
    ///   [1] verifier_address (readonly) — the verifier to grant access to
    pub fn grant_access<'info>(
        ctx: Context<'_, '_, '_, 'info, GrantAccess<'info>>,
        field_index: u8,
    ) -> Result<()> {
        require!(
            (field_index as usize) < KYC_FIELD_COUNT,
            KycError::InvalidFieldIndex
        );

        let kyc = &ctx.accounts.kyc_account;
        require!(kyc.owner == ctx.accounts.authority.key(), KycError::Unauthorized);

        let handle = kyc.fields[field_index as usize];
        require!(handle != 0, KycError::FieldNotSubmitted);

        require!(
            ctx.remaining_accounts.len() >= 2,
            KycError::MissingAccounts
        );

        let inco = ctx.accounts.inco_lightning_program.to_account_info();
        let signer = ctx.accounts.authority.to_account_info();
        let allowance_account = &ctx.remaining_accounts[0];
        let verifier_address = &ctx.remaining_accounts[1];

        let cpi_ctx = CpiContext::new(
            inco.clone(),
            Allow {
                allowance_account: allowance_account.clone(),
                signer: signer.clone(),
                allowed_address: verifier_address.clone(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );

        allow(cpi_ctx, handle, true, verifier_address.key())?;

        msg!(
            "Decrypt access for field {} granted to {}",
            field_index,
            verifier_address.key()
        );

        Ok(())
    }

    /// Revoke a verifier's decryption access to a specific field.
    ///
    /// remaining_accounts:
    ///   [0] allowance_account (mut)
    ///   [1] verifier_address (readonly)
    pub fn revoke_access<'info>(
        ctx: Context<'_, '_, '_, 'info, GrantAccess<'info>>,
        field_index: u8,
    ) -> Result<()> {
        require!(
            (field_index as usize) < KYC_FIELD_COUNT,
            KycError::InvalidFieldIndex
        );

        let kyc = &ctx.accounts.kyc_account;
        require!(kyc.owner == ctx.accounts.authority.key(), KycError::Unauthorized);

        let handle = kyc.fields[field_index as usize];
        require!(handle != 0, KycError::FieldNotSubmitted);

        require!(
            ctx.remaining_accounts.len() >= 2,
            KycError::MissingAccounts
        );

        let inco = ctx.accounts.inco_lightning_program.to_account_info();
        let signer = ctx.accounts.authority.to_account_info();
        let allowance_account = &ctx.remaining_accounts[0];
        let verifier_address = &ctx.remaining_accounts[1];

        let cpi_ctx = CpiContext::new(
            inco.clone(),
            Allow {
                allowance_account: allowance_account.clone(),
                signer: signer.clone(),
                allowed_address: verifier_address.clone(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );

        allow(cpi_ctx, handle, false, verifier_address.key())?;

        msg!(
            "Decrypt access for field {} revoked from {}",
            field_index,
            verifier_address.key()
        );

        Ok(())
    }
}

// ─── Accounts ────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeKyc<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + KycAccount::INIT_SPACE,
        seeds = [b"kyc", authority.key().as_ref()],
        bump,
    )]
    pub kyc_account: Account<'info, KycAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitField<'info> {
    #[account(
        mut,
        seeds = [b"kyc", authority.key().as_ref()],
        bump,
    )]
    pub kyc_account: Account<'info, KycAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GrantAccess<'info> {
    #[account(
        seeds = [b"kyc", authority.key().as_ref()],
        bump,
    )]
    pub kyc_account: Account<'info, KycAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// ─── State ───────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct KycAccount {
    /// Owner wallet pubkey
    pub owner: Pubkey,
    /// 6 encrypted field handles (u128 each):
    ///   0=name, 1=dob, 2=nationality, 3=doc_type, 4=doc_number, 5=address
    #[max_len(6)]
    pub fields: [u128; 6],
    /// Number of fields submitted
    pub field_count: u8,
    /// Whether the KYC has been verified by an authorized party
    pub is_verified: bool,
    /// Unix timestamp of submission
    pub submitted_at: i64,
}

// ─── Errors ──────────────────────────────────────────────────

#[error_code]
pub enum KycError {
    #[msg("Field index must be 0-5")]
    InvalidFieldIndex,
    #[msg("Only the KYC owner can perform this action")]
    Unauthorized,
    #[msg("This field has not been submitted yet")]
    FieldNotSubmitted,
    #[msg("Missing required remaining accounts")]
    MissingAccounts,
}
