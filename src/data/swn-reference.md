# SWN Rules Reference for Ship Module Implementation

## Cargo & Weight System
- **Tracked by**: Free Mass points (not directly by weight)
- **Cargo per Mass point**:
  - Fighters: 2 tons
  - Frigates: 20 tons  
  - Cruisers: 200 tons
  - Capital-class: 2000 tons
- **Note**: One cubic meter typically = one ton
- **Standard practice**: Ships need to track how much cargo they can safely carry based on Free Mass

## Ship Damage & Crises (Combat)
- **System disabled**: Damage can disable specific ship systems until repaired
- **Cargo Loss Crisis**: Hit opens cargo bay - lose d10*10% of cargo if not resolved by next round
- **Damage Control Action**: Repair 2-6 HP per round depending on ship class

## Ship Systems/Modules
Ships have modular systems that can:
- Consume Power and Mass
- Be damaged/disabled in combat
- Require repairs to restore functionality
- Include: Weapons, Defenses, Fittings, Drive, Spike Drive, etc.

## Ammunition
- Ammunition is standardized and interchangeable across projectile weapons
- Can be tracked as ship-wide supply
- Ships often carry ammo and power cells in cargo holds

## Key Resources
1. **Hit Points**: Ship damage capacity
2. **Power**: Required to run systems (Power pool)
3. **Mass**: Used for cargo space and module installation
4. **Hardpoints**: Number of weapons that can be mounted
5. **Crew**: Current crew size affects daily operating costs

## Ship Classes & Cargo Space
- Fighters: Small cargo space
- Frigates: Medium cargo space
- Cruisers: Large cargo space (200+ tons possible)
- Capital: Massive cargo space (2000+ tons possible)
