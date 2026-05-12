use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

declare_id!("FhJCrC4QMtAjiDkBVG85d9mLfieJdzXtQ7FQLgvAin4j");

const PROFILE_FIELD_COUNT: usize = 8;
const OUTCOME_FIELD_COUNT: usize = 5;
const COMP_DEF_OFFSET_COMPUTE_ELIGIBILITY: u32 = comp_def_offset("compute_eligibility_clean");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PolicyConfigArgs {
    #[max_len(8, 4)]
    pub allowed_jurisdictions: Vec<String>,
    pub requires_accreditation: bool,
    pub max_allocation_tier_a: u64,
    pub max_allocation_tier_b: u64,
    pub max_allocation_tier_c: u64,
    pub manual_review_on_pep: bool,
    pub manual_review_on_sanctions: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CallbackStoredOutcome {
    pub eligible: bool,
    pub risk_tier: u8,
    pub max_allocation: u64,
    pub manual_review: bool,
    pub required_reveal_mask: u16,
}

#[arcium_program]
pub mod claimrail {
    use super::*;

    pub fn initialize_policy(ctx: Context<InitializePolicy>, args: PolicyConfigArgs) -> Result<()> {
        let policy = &mut ctx.accounts.policy_account;
        policy.issuer = ctx.accounts.issuer.key();
        policy.allowed_jurisdictions = args.allowed_jurisdictions;
        policy.requires_accreditation = args.requires_accreditation;
        policy.max_allocation_tier_a = args.max_allocation_tier_a;
        policy.max_allocation_tier_b = args.max_allocation_tier_b;
        policy.max_allocation_tier_c = args.max_allocation_tier_c;
        policy.manual_review_on_pep = args.manual_review_on_pep;
        policy.manual_review_on_sanctions = args.manual_review_on_sanctions;
        policy.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn initialize_dossier(ctx: Context<InitializeDossier>) -> Result<()> {
        let dossier = &mut ctx.accounts.dossier_account;
        dossier.applicant = ctx.accounts.applicant.key();
        dossier.policy = ctx.accounts.policy_account.key();
        dossier.submitted_at = 0;
        dossier.field_count = 0;
        dossier.encrypted_inputs = vec![[0u8; 32]; PROFILE_FIELD_COUNT];
        Ok(())
    }

    pub fn submit_encrypted_profile(
        ctx: Context<SubmitEncryptedProfile>,
        encrypted_inputs: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(
            encrypted_inputs.len() == PROFILE_FIELD_COUNT,
            ErrorCode::InvalidProfileInputCount
        );
        let dossier = &mut ctx.accounts.dossier_account;
        require_keys_eq!(
            dossier.applicant,
            ctx.accounts.applicant.key(),
            ErrorCode::Unauthorized
        );
        dossier.encrypted_inputs = encrypted_inputs;
        dossier.field_count = PROFILE_FIELD_COUNT as u8;
        dossier.submitted_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn init_compute_eligibility_comp_def(
        ctx: Context<InitComputeEligibilityCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn compute_eligibility(
        ctx: Context<ComputeEligibility>,
        computation_offset: u64,
        encrypted_jurisdiction: [u8; 32],
        encrypted_accredited: [u8; 32],
        encrypted_net_worth_band: [u8; 32],
        encrypted_pep_status: [u8; 32],
        encrypted_sanctions_flag: [u8; 32],
        encrypted_requested_allocation: [u8; 32],
        arcium_pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let args = ArgBuilder::new()
            .x25519_pubkey(arcium_pubkey)
            .plaintext_u128(nonce)
            .encrypted_bool(encrypted_jurisdiction)
            .encrypted_bool(encrypted_accredited)
            .encrypted_u8(encrypted_net_worth_band)
            .encrypted_u64(encrypted_requested_allocation)
            .encrypted_bool(encrypted_pep_status)
            .encrypted_bool(encrypted_sanctions_flag)
            .encrypted_bool(ctx.accounts.dossier_account.encrypted_inputs[6])
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ComputeEligibilityCleanCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.eligibility_account.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.dossier_account.key(),
                        is_writable: false,
                    },
                ],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "compute_eligibility_clean")]
    pub fn compute_eligibility_clean_callback(
        ctx: Context<ComputeEligibilityCleanCallback>,
        output: SignedComputationOutputs<ComputeEligibilityCleanOutput>,
    ) -> Result<()> {
        let result = output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        )?;
        let encrypted_outcome = result.field_0;
        let eligibility = &mut ctx.accounts.eligibility_account;
        eligibility.applicant = ctx.accounts.dossier_account.applicant;
        eligibility.policy = ctx.accounts.dossier_account.policy;
        eligibility.outcome_encryption_key = encrypted_outcome.encryption_key;
        eligibility.outcome_nonce = encrypted_outcome.nonce;
        eligibility.encrypted_outcome = encrypted_outcome.ciphertexts;
        eligibility.computed_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn grant_reveal(ctx: Context<UpdateRevealPermission>, field_index: u8) -> Result<()> {
        let permission = &mut ctx.accounts.permission_account;
        let dossier = &ctx.accounts.dossier_account;
        require_keys_eq!(
            dossier.applicant,
            ctx.accounts.applicant.key(),
            ErrorCode::Unauthorized
        );
        require!(
            (field_index as usize) < PROFILE_FIELD_COUNT,
            ErrorCode::InvalidFieldIndex
        );
        permission.applicant = dossier.applicant;
        permission.verifier = ctx.accounts.verifier.key();
        permission.allowed_mask |= 1u16 << field_index;
        permission.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn revoke_reveal(ctx: Context<UpdateRevealPermission>, field_index: u8) -> Result<()> {
        let permission = &mut ctx.accounts.permission_account;
        let dossier = &ctx.accounts.dossier_account;
        require_keys_eq!(
            dossier.applicant,
            ctx.accounts.applicant.key(),
            ErrorCode::Unauthorized
        );
        require!(
            (field_index as usize) < PROFILE_FIELD_COUNT,
            ErrorCode::InvalidFieldIndex
        );
        permission.allowed_mask &= !(1u16 << field_index);
        permission.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct PolicyAccount {
    pub issuer: Pubkey,
    #[max_len(8, 4)]
    pub allowed_jurisdictions: Vec<String>,
    pub requires_accreditation: bool,
    pub max_allocation_tier_a: u64,
    pub max_allocation_tier_b: u64,
    pub max_allocation_tier_c: u64,
    pub manual_review_on_pep: bool,
    pub manual_review_on_sanctions: bool,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct ApplicantDossier {
    pub applicant: Pubkey,
    pub policy: Pubkey,
    #[max_len(8)]
    pub encrypted_inputs: Vec<[u8; 32]>,
    pub field_count: u8,
    pub submitted_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct EligibilityResultAccount {
    pub applicant: Pubkey,
    pub policy: Pubkey,
    pub outcome_encryption_key: [u8; 32],
    pub outcome_nonce: u128,
    pub encrypted_outcome: [[u8; 32]; OUTCOME_FIELD_COUNT],
    pub computed_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct RevealPermissionAccount {
    pub applicant: Pubkey,
    pub verifier: Pubkey,
    pub allowed_mask: u16,
    pub updated_at: i64,
}

#[derive(Accounts)]
pub struct InitializePolicy<'info> {
    #[account(
        init,
        payer = issuer,
        space = 8 + PolicyAccount::INIT_SPACE,
        seeds = [b"policy", issuer.key().as_ref()],
        bump
    )]
    pub policy_account: Account<'info, PolicyAccount>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeDossier<'info> {
    #[account(mut)]
    pub applicant: Signer<'info>,
    pub policy_account: Account<'info, PolicyAccount>,
    #[account(
        init,
        payer = applicant,
        space = 8 + ApplicantDossier::INIT_SPACE,
        seeds = [b"dossier", applicant.key().as_ref(), policy_account.key().as_ref()],
        bump
    )]
    pub dossier_account: Account<'info, ApplicantDossier>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitEncryptedProfile<'info> {
    #[account(mut)]
    pub applicant: Signer<'info>,
    #[account(
        mut,
        seeds = [b"dossier", applicant.key().as_ref(), policy_account.key().as_ref()],
        bump
    )]
    pub dossier_account: Account<'info, ApplicantDossier>,
    pub policy_account: Account<'info, PolicyAccount>,
}

#[init_computation_definition_accounts("compute_eligibility_clean", payer)]
#[derive(Accounts)]
pub struct InitComputeEligibilityCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(
        mut,
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_COMPUTE_ELIGIBILITY)
    )]
    /// CHECK: checked by the Arcium program while initializing the computation definition.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: checked by the Arcium program while initializing the computation definition.
    pub address_lookup_table: UncheckedAccount<'info>,
    /// CHECK: checked by the Arcium program while initializing the computation definition.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("compute_eligibility_clean", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ComputeEligibility<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 9,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: validated by the Arcium queue_computation CPI.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: validated by the Arcium queue_computation CPI.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: validated by the Arcium queue_computation CPI.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_COMPUTE_ELIGIBILITY))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    #[account(mut)]
    pub dossier_account: Account<'info, ApplicantDossier>,
    #[account(
        init,
        payer = payer,
        space = 8 + EligibilityResultAccount::INIT_SPACE,
        seeds = [b"eligibility", dossier_account.key().as_ref()],
        bump
    )]
    pub eligibility_account: Account<'info, EligibilityResultAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("compute_eligibility_clean")]
#[derive(Accounts)]
pub struct ComputeEligibilityCleanCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_COMPUTE_ELIGIBILITY))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: validated by the Arcium callback context
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    /// CHECK: checked by account constraint
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub eligibility_account: Account<'info, EligibilityResultAccount>,
    pub dossier_account: Account<'info, ApplicantDossier>,
}

#[derive(Accounts)]
pub struct UpdateRevealPermission<'info> {
    #[account(mut)]
    pub applicant: Signer<'info>,
    #[account(mut)]
    /// CHECK: this is a verifier wallet recorded in the reveal permission PDA; no account data is read.
    pub verifier: UncheckedAccount<'info>,
    #[account(
        seeds = [b"dossier", applicant.key().as_ref(), dossier_account.policy.as_ref()],
        bump
    )]
    pub dossier_account: Account<'info, ApplicantDossier>,
    #[account(
        init_if_needed,
        payer = applicant,
        space = 8 + RevealPermissionAccount::INIT_SPACE,
        seeds = [b"permission", dossier_account.key().as_ref(), verifier.key().as_ref()],
        bump
    )]
    pub permission_account: Account<'info, RevealPermissionAccount>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Only the applicant or issuer can perform this action")]
    Unauthorized,
    #[msg("Expected 8 encrypted input fields")]
    InvalidProfileInputCount,
    #[msg("Invalid field index")]
    InvalidFieldIndex,
    #[msg("Arcium cluster is not configured")]
    ClusterNotSet,
}
