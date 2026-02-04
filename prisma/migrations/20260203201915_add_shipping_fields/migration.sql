/*
  Warnings:

  - A unique constraint covering the columns `[date,startTime,endTime]` on the table `DeliveryWindow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DeliveryWindow_date_startTime_endTime_key" ON "DeliveryWindow"("date", "startTime", "endTime");
