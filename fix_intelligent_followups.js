/**
 * Fix Intelligent Follow-ups Script
 * 
 * This script checks all forms in the database and ensures they have
 * intelligent follow-ups enabled if they have a manifesto.
 */

import { supabase } from './lib/supabase.js';

async function fixIntelligentFollowups() {
    console.log('🔧 Starting intelligent follow-ups fix...');
    
    try {
        // Get all forms
        const { data: forms, error } = await supabase
            .from('forms')
            .select('id, title, settings, manifesto')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error fetching forms:', error);
            return;
        }
        
        console.log(`📋 Found ${forms.length} forms to check`);
        
        let fixedCount = 0;
        let skippedCount = 0;
        
        for (const form of forms) {
            const currentSettings = form.settings || {};
            const hasManifesto = form.manifesto && form.manifesto.trim().length > 0;
            const intelligentFollowUpsEnabled = currentSettings.intelligent_follow_ups === true;
            
            console.log(`\n📝 Form: ${form.title} (${form.id})`);
            console.log(`   Manifesto: ${hasManifesto ? '✅ Yes' : '❌ No'}`);
            console.log(`   Intelligent Follow-ups: ${intelligentFollowUpsEnabled ? '✅ Enabled' : '❌ Disabled'}`);
            
            // Enable intelligent follow-ups if form has a manifesto but doesn't have them enabled
            if (hasManifesto && !intelligentFollowUpsEnabled) {
                console.log('   🔧 Enabling intelligent follow-ups...');
                
                const updatedSettings = {
                    ...currentSettings,
                    intelligent_follow_ups: true
                };
                
                const { error: updateError } = await supabase
                    .from('forms')
                    .update({ 
                        settings: updatedSettings,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', form.id);
                
                if (updateError) {
                    console.error(`   ❌ Failed to update form ${form.id}:`, updateError);
                } else {
                    console.log('   ✅ Successfully enabled intelligent follow-ups');
                    fixedCount++;
                }
            } else if (!hasManifesto) {
                console.log('   ⏭️ Skipping - no manifesto');
                skippedCount++;
            } else {
                console.log('   ✅ Already properly configured');
                skippedCount++;
            }
        }
        
        console.log(`\n🎉 Fix completed!`);
        console.log(`   Fixed: ${fixedCount} forms`);
        console.log(`   Skipped: ${skippedCount} forms`);
        console.log(`   Total: ${forms.length} forms`);
        
    } catch (error) {
        console.error('❌ Script failed:', error);
    }
}

// Run the fix
fixIntelligentFollowups(); 