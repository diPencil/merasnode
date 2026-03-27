-- Add triggerKeywords to BotFlow for keyword-based flow start (incoming messages)
ALTER TABLE `BotFlow` ADD COLUMN `triggerKeywords` JSON NULL;
