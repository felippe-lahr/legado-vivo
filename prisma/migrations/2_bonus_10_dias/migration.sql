-- AlterTable: campos do bônus de 10 dias (Carta 2)
ALTER TABLE "sessions" ADD COLUMN "pergunta_pendente" TEXT;
ALTER TABLE "sessions" ADD COLUMN "resposta_bonus" TEXT;
ALTER TABLE "sessions" ADD COLUMN "carta_2" TEXT;
ALTER TABLE "sessions" ADD COLUMN "carta_1_enviada_em" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN "lembrete_dia7_em" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN "lembrete_final_em" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN "carta_2_enviada_em" TIMESTAMP(3);
