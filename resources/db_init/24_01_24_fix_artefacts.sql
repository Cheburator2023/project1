update artefact_realizations_new
set artefact_string_value = '1'
where artefact_id = 2012 and artefact_string_value in ('2', '3', '4');

delete
from artefact_realizations_new
where where artefact_id = 2015 and artefact_string_value in ('не применимо', '-');

update artefact_realizations_new
set artefact_string_value = '01/10/2021 04/04/2022'
where artefact_id = 2015 and model_id = 'a8049a9d-ba40-11ec-bac6-0242ac11000d';

update artefact_realizations_new
set artefact_string_value = '01/10/2022 02/04/2023'
where artefact_id = 2015 and model_id = 'ca650916-b693-11ed-a9f8-0a5801050287';

update artefact_realizations_new
set artefact_string_value = '27/11/2021 25/05/2022'
where artefact_id = 2015 and model_id = '7ba5df22-b0e5-11ec-bac6-0242ac11000d';

update artefact_realizations_new
set artefact_string_value = 'Низкий'
where artefact_id = 2021 and model_id in ('a8049a9d-ba40-11ec-bac6-0242ac11000d', '4dd5fc29-a3b5-11ec-bac6-0242ac11000d');

delete
from artefact_realizations_new
where  artefact_id = 2021 and artefact_string_value in ('не применимо', 'не утвержден');

update artefact_realizations_new
set artefact_string_value = 'Средний'
where artefact_id = 2021 and model_id in ('476e1dcf-036f-4383-960b-cee462b90885');

update models_new
set model_desc = 'Модель включает:
 - определение рейтинга Контрагента (Рейтинга 1) с учетом:
а) рейтинга, установленного на уровне Банк ВТБ (ПАО)  - при наличии;
б) агрегированной балльной оценки, сформированной на основе взвешенных балльных оценок по блокам бизнес-показателей и финансовых показатей, и определения соответствующего ей рейтинга Контрагента;
в) экспертной оценки рейтинга для Индивидуальных предпринимателей;
 - определение рейтинга связи клиент-дебитор (Рейтинга 2) с учетом взвешенной балльной оценки по набору качественных показателей.
 Уровень материальности Средний - В соответствии с Решением Финансового Комитета ВТБ №382 от 21.07.2020, Приложение 3, доля портфеля ВТБФ в активах Банка составляет 1,65%'
where model_id in ('476e1dcf-036f-4383-960b-cee462b90885');

update artefact_realizations_new
set artefact_string_value = 'Средний'
where artefact_id = 2021 and model_id in ('4a5fbdc6-4aba-4982-82d2-80f59b3ddc36');

update models_new
set model_desc = 'Модель включает:
-определение доли потерь при дефолте с учетом исторической величины стоимости возмещения
 Уровень материальности Средний - В соответствии с Решением Финансового Комитета ВТБ №382 от 21.07.2020, Приложение 3, доля портфеля ВТБФ в активах Банка составляет 1,65%'
where model_id in ('4a5fbdc6-4aba-4982-82d2-80f59b3ddc36');

delete
from artefact_realizations_new
where  artefact_id = 2021 and artefact_string_value in ('модель эксплуатируется', 'не утвержден');

update artefact_realizations_new
set artefact_string_value = '01/06/2021'
where artefact_id = 2034 and model_id in ('f24f6771-a1d8-11eb-8c85-0242ac11000d');

delete
from artefact_realizations_new
where  artefact_id = 2034 and artefact_string_value in ('модель эксплуатируется', 'действующая модель');

update artefact_realizations_new
set artefact_string_value = '06.11.2019 31.03.2023'
where artefact_id = 2034 and model_id in ('af0e8ff7-e4a4-43cf-921b-18ab076ea23d');

update artefact_realizations_new
set artefact_string_value = '06.11.2019 31.03.2023'
where artefact_id = 2034 and model_id in ('4606b183-2caf-4246-8e3b-450c7d04a3f0');



update artefact_realizations_new
set artefact_string_value = '21.02.2020 12.04.2022'
where artefact_id = 2034 and model_id in ('8f1d3e9c-ddaf-4a70-bb47-9bce6d757cab');

update artefact_realizations_new
set artefact_string_value = '16.05.2019 04.04.2022'
where artefact_id = 2034 and model_id in ('e5e16063-55ca-4a6d-8757-ccb5d130ed8f');

update artefact_realizations_new
set artefact_string_value = '23.05.2019 31.05.2022'
where artefact_id = 2034 and model_id in ('9933e275-3747-48be-bb3a-255622b6df7f');

update artefact_realizations_new
set artefact_string_value = '01.10.2023'
where artefact_id = 2034 and model_id in ('527dab47-bf11-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '21.10.21'
where artefact_id = 2034 and model_id in ('7a73a7ac-b989-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '31.07.2022'
where artefact_id = 2034 and model_id in ('bf59b094-1fd3-11ed-bcf6-0a58010403c1');

update artefact_realizations_new
set artefact_string_value = '31.05.2023'
where artefact_id = 2034 and model_id in ('394a5576-3ae4-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '31.05.2023'
where artefact_id = 2034 and model_id in ('591396a6-4d24-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '21.10.2021'
where artefact_id = 2034 and model_id in ('7a73a7ac-b989-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '31.12.2021'
where artefact_id = 2034 and model_id in ('8d8fc744-f5e8-11eb-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '31.12.2021'
where artefact_id = 2034 and model_id in ('dce52ac8-4920-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '31.12.2021'
where artefact_id = 2034 and model_id in ('8def8d82-492f-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '21.02.2020 30.07.2021'
where artefact_id = 2034 and model_id in ('bd278806-147a-46b0-9a22-8c0ad886b295');

update artefact_realizations_new
set artefact_string_value = '22.11.2020 14.11.2020'
where artefact_id = 2034 and model_id in ('607465c8-a3bd-11ec-bac6-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '01.06.2021 12.09.2022'
where artefact_id = 2034 and model_id in ('c4a42f09-596d-4fcb-91c6-1a030d28691c');

update artefact_realizations_new
set artefact_string_value = '26/11/2021 29/07/2022'
where artefact_id = 2034 and model_id in ('7ba5df22-b0e5-11ec-bac6-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '31.12.2021 01.03.2022 01.03.2023 01.03.2022'
where artefact_id = 2034 and model_id in ('8d13bae6-33b4-40f6-8eef-0278cf10b5d4');

update artefact_realizations_new
set artefact_string_value = '27/06/2022 31/07/2022 05/12/2022 25/02/2023'
where artefact_id = 2034 and model_id in ('e6c64f8b-b692-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '31/08/2021 31/03/2023'
where artefact_id = 2034 and model_id in ('116b3e06-6765-4510-bdcd-18bd9d99cbb3');

update artefact_realizations_new
set artefact_string_value = '24/09/2021 28/02/2023'
where artefact_id = 2034 and model_id in ('db2ca7b9-ba75-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '30/04/2022 31/03/2023'
where artefact_id = 2034 and model_id in ('3caa28c3-539e-4c5b-a366-059d9ecccd33',
'69f8a785-b691-11ed-a9f8-0a5801050287',
'69f8a785-b691-11ed-a9f8-0a5801050287',
'4baef1d1-1e43-4f9b-8d8d-5a6665b05504',
'99f97e02-c438-4b46-b8bc-7a26a1fb00c5',
'39387ed8-bd6a-49d9-bdbe-223d1f1c2e45');

delete
from artefact_realizations_new
where  artefact_id = 2040 and artefact_string_value in ('-');

update artefact_realizations_new
set artefact_string_value = '01/01/2011'
where artefact_id = 2040 and model_id in ('6d6a6bcf-82a7-4dbf-8870-203c57313443');

delete
from artefact_realizations_new
where  artefact_id = 2041 and artefact_string_value in ('не применимо', 'Нет данных', 'Нет даных');

update artefact_realizations_new
set artefact_string_value = '30/12/2018'
where artefact_id = 2041 and model_id in ('a476d308-fd7a-4fd8-a1ca-7abef51f0503');

update artefact_realizations_new
set artefact_string_value = '28.03.2011'
where artefact_id = 2041 and model_id in ('6d6a6bcf-82a7-4dbf-8870-203c57313443');


update artefact_realizations_new
set artefact_string_value = '26.12.2022'
where artefact_id = 2041 and model_id in ('9b27b446-70e7-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '30.07.2021'
where artefact_id = 2041 and model_id in ('8d8fc744-f5e8-11eb-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '09.11.2021'
where artefact_id = 2041 and model_id in ('dce52ac8-4920-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '09.11.2021'
where artefact_id = 2041 and model_id in ('8def8d82-492f-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '30.07.2021'
where artefact_id = 2041 and model_id in ('0845e930-4930-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '24.10.2022'
where artefact_id = 2041 and model_id in ('950f11ea-5136-11ed-89eb-0a5801060416');

update artefact_realizations_new
set artefact_string_value = '28.06.2023'
where artefact_id = 2041 and model_id in ('527dab47-bf11-11ed-a9f8-0a5801050287');

delete
from artefact_realizations_new
where  artefact_id = 2054 and artefact_string_value in ('Отчет не утверждается','нет', 'не проводилась', 'Нет', 'нет данных', 'не применимо');


update artefact_realizations_new
set artefact_string_value = '30.12.2021'
where artefact_id = 2054 and model_id in ('b7440ea0-1d2b-4a51-876a-1fb6eaba5583');

update artefact_realizations_new
set artefact_string_value = '21.01.2022'
where artefact_id = 2054 and model_id in ('2447bc77-97a8-4ec2-a588-9a7f4b833e42');

update artefact_realizations_new
set artefact_string_value = '15.02.2021'
where artefact_id = 2054 and model_id in ('c49cf410-f376-421e-85d0-c5b5eac87f9f');

update artefact_realizations_new
set artefact_string_value = '04.05.2022'
where artefact_id = 2054 and model_id in ('c4d43ae3-47f7-11ec-80d2-0242ac11000d',
'521a361f-47fd-11ec-80d2-0242ac11000d',
'5c545aef-47fe-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '01.03.2021'
where artefact_id = 2054 and model_id in ('607465c8-a3bd-11ec-bac6-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '30.11.2020'
where artefact_id = 2054 and model_id in ('4242eec3-7d5b-4762-a261-d6a73fd2c1fa',
'b550ac17-4a14-432b-bf6a-965bfd15d687');

update artefact_realizations_new
set artefact_string_value = '21.01.2022'
where artefact_id = 2054 and model_id in ('f535e11b-a3aa-4bf0-ae1a-2a7f04c5aa12');

update artefact_realizations_new
set artefact_string_value = '27.11.2018'
where artefact_id = 2054 and model_id in ('af17c249-50a9-4dcd-bc6a-1665ecf23d68');

update artefact_realizations_new
set artefact_string_value = '19.04.2022'
where artefact_id = 2054 and model_id in ('5f3f385d-2a7d-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '25.08.2022'
where artefact_id = 2054 and model_id in ('a741ca37-ba75-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '07.06.2018'
where artefact_id = 2054 and model_id in ('20cab56f-d46f-4bcb-a672-c72dd45cfc18');

update artefact_realizations_new
set artefact_string_value = '19.08.2019'
where artefact_id = 2054 and model_id in ('21138fbe-8052-4231-8ddc-cdf91d442147');

update artefact_realizations_new
set artefact_string_value = '09.11.2017'
where artefact_id = 2054 and model_id in ('7f99e156-daa1-4864-8b2f-022be9ae8c84');

update artefact_realizations_new
set artefact_string_value = '11.07.2018'
where artefact_id = 2054 and model_id in ('4601a6f4-95ab-4866-a33a-d1dd66d53c53');

update artefact_realizations_new
set artefact_string_value = '11.11.2016'
where artefact_id = 2054 and model_id in ('3d8656a8-fef3-4418-8a41-f68303639c19');

update artefact_realizations_new
set artefact_string_value = '01.12.2016'
where artefact_id = 2054 and model_id in ('1c1274e5-c9a9-49a7-b936-817b7a11b729','13b48330-2ba7-4624-99bd-365d2125c874',
'5cdbc53e-0aa3-4987-82ce-7260a31bd76f',
'6ded4c4b-acdc-4645-9ce0-6f963b4a6527',
'23464b06-fe75-40b1-9014-1b3e06d4e0dd',
'a620fa41-e8c6-499d-9984-caef034be4ed',
'95037dda-c3e6-4333-bdfb-8400cc8e35d1',
'b9f42847-3717-4774-95fd-9673a2184006',
'e932c0d2-cf67-4ba1-983c-9b9f14922229'
);

update artefact_realizations_new
set artefact_string_value = '12.02.2021'
where artefact_id = 2054 and model_id in (
'0d4da799-c839-4042-b81b-f690e200fce0',
'98cae326-5c56-11ee-9d0f-0a5801010611',
'd22bf62e-5c41-11ee-9d0f-0a5801010611',
'355cb9de-5c5c-11ee-9d0f-0a5801010611',
'6a5391ea-5c43-11ee-9d0f-0a5801010611',
'a58b4a82-5c42-11ee-9d0f-0a5801010611',
'585d464f-5c54-11ee-9d0f-0a5801010611',
'bce0b7f4-5c40-11ee-9d0f-0a5801010611',
'58597aa8-5c67-11ee-9d0f-0a5801010611',
'a53fba73-5c45-11ee-9d0f-0a5801010611',
'0520be10-5c68-11ee-9d0f-0a5801010611',
'69f8c0e8-5c46-11ee-9d0f-0a5801010611',
'a6c550dc-5c67-11ee-9d0f-0a5801010611',
'1e6cb214-5c46-11ee-9d0f-0a5801010611',
'339b6638-5c5d-11ee-9d0f-0a5801010611',
'3fbf3c0f-5c45-11ee-9d0f-0a5801010611',
'df5d779e-5c69-11ee-9d0f-0a5801010611',
'64242614-5c4a-11ee-9d0f-0a5801010611',
'e1ed54f5-5c6a-11ee-9d0f-0a5801010611',
'f4117ae4-5c4c-11ee-9d0f-0a5801010611',
'2c485322-5c6a-11ee-9d0f-0a5801010611',
'2635b2a7-5c4b-11ee-9d0f-0a5801010611',
'7b5937fa-5c69-11ee-9d0f-0a5801010611',
'f9d77957-5c49-11ee-9d0f-0a5801010611',
'2f9f704b-5c6e-11ee-9d0f-0a5801010611',
'82c75840-5c52-11ee-9d0f-0a5801010611',
'cd8fb866-5c6e-11ee-9d0f-0a5801010611',
'7ab04f5e-5c53-11ee-9d0f-0a5801010611',
'82e5f38b-5c6e-11ee-9d0f-0a5801010611',
'f057bf4d-5c52-11ee-9d0f-0a5801010611',
'9172bbc5-5c6d-11ee-9d0f-0a5801010611',
'a784d2aa-5c51-11ee-9d0f-0a5801010611',
'ace7c34e-5c6b-11ee-9d0f-0a5801010611',
'14864b28-5c6d-11ee-9d0f-0a5801010611',
'cbe3f581-5c4f-11ee-9d0f-0a5801010611',
'62a04d29-5c6c-11ee-9d0f-0a5801010611',
'715fa785-5c4f-11ee-9d0f-0a5801010611',
'44940069-5c6b-11ee-9d0f-0a5801010611',
'ea4ce8c5-5c4d-11ee-9d0f-0a5801010611',
'f82bb65a-e283-11ec-8325-0a580107050e',
'cd908690-02cf-11ed-8ba4-0a580102075a'
);

update artefact_realizations_new
set artefact_string_value = '01.12.2022'
where artefact_id = 2054 and model_id in ('8a0c181d-8304-4f0c-9eea-344d7b32e8e9','1da491b7-e3eb-46f3-b32a-ca550b97e657');

update artefact_realizations_new
set artefact_string_value = '27.05.2021'
where artefact_id = 2054 and model_id in ('acc73dae-c56e-44f0-9e83-efa72509993d');

update artefact_realizations_new
set artefact_string_value = '30.06.2023'
where artefact_id = 2054 and model_id in ('c4a42f09-596d-4fcb-91c6-1a030d28691c','bf59b094-1fd3-11ed-bcf6-0a58010403c1');

update artefact_realizations_new
set artefact_string_value = '09.06.2017'
where artefact_id = 2054 and model_id in ('b3c89ed6-b905-463f-8cdc-05282941fa69');

update artefact_realizations_new
set artefact_string_value = '23.12.2022'
where artefact_id = 2054 and model_id in ('d7d078f7-d910-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '01.12.2020'
where artefact_id = 2054 and model_id in ('399bb8bf-0beb-11ed-8325-0a580107050e');

update artefact_realizations_new
set artefact_string_value = '01.12.2021'
where artefact_id = 2054 and model_id in ('10327592-dd56-4f53-a90a-965669757242',
'5f70171a-b04a-4435-82d6-7e7408d69fa3',
'2c78044b-6a64-11ed-a9f8-0a5801050287',
'8db26819-f616-44a9-82ce-aa147a150ca7',
'3d916085-b637-40ba-95c4-61ef6ac38bcc');

update artefact_realizations_new
set artefact_string_value = '01.12.2022'
where artefact_id = 2054 and model_id in ('8d8fc744-f5e8-11eb-b149-0242ac11000d',
'dce52ac8-4920-11ec-80d2-0242ac11000d',
'8def8d82-492f-11ec-80d2-0242ac11000d',
'e9d4d7ef-d392-43d2-b622-b56a948fd3c7',
'58da8faf-40d0-4bb8-9e53-6d3ea13500fd',
'791a5cee-715b-4a05-9ce6-70afc1699a5c',
'9c484f61-d05e-41e3-92d5-55f25e11e02d',
'1992155c-9386-48f2-b26a-6ff84da05413',
'4e27b59d-a1c0-11eb-8c85-0242ac11000d',
'7112d228-0b5e-498c-ae03-3e4846720357',
'1f9fb09a-5b6f-11ed-89eb-0a5801060416',
'0845e930-4930-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '01.12.2019'
where artefact_id = 2054 and model_id in ('67a6bf1d-d835-11ec-aca9-0a58010006b2',
'71c4dada-d837-11ec-aca9-0a58010006b2');

update artefact_realizations_new
set artefact_string_value = '01.01.2023'
where artefact_id = 2054 and model_id in ('950f11ea-5136-11ed-89eb-0a5801060416');

update artefact_realizations_new
set artefact_string_value = '03.09.2022'
where artefact_id = 2054 and model_id in ('92cf344d-05cd-11ec-b149-0242ac11000d',
'e086ca8f-05cc-11ec-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '20.05.2022'
where artefact_id = 2055 and model_id in ('c4d43ae3-47f7-11ec-80d2-0242ac11000d',
'521a361f-47fd-11ec-80d2-0242ac11000d',
'5c545aef-47fe-11ec-80d2-0242ac11000d'
);

update artefact_realizations_new
set artefact_string_value = '29.04.2022'
where artefact_id = 2055 and model_id in ('5f3f385d-2a7d-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '02.09.2022'
where artefact_id = 2055 and model_id in ('a741ca37-ba75-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '12.08.2022'
where artefact_id = 2055 and model_id in ('92cf344d-05cd-11ec-b149-0242ac11000d', 'e086ca8f-05cc-11ec-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '30.12.2022'
where artefact_id = 2055 and model_id in ('d7d078f7-d910-11eb-8c85-0242ac11000d');


update artefact_realizations_new
set artefact_string_value = '23.10.2020'
where artefact_id = 2094 and model_id in ('c4d43ae3-47f7-11ec-80d2-0242ac11000d',
'521a361f-47fd-11ec-80d2-0242ac11000d',
'5c545aef-47fe-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '11.09.2017'
where artefact_id = 2094 and model_id in ('5f3f385d-2a7d-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '02.06.2021'
where artefact_id = 2094 and model_id in ('35cdba9c-9d76-48e5-8efc-9b0eca492abe');

update artefact_realizations_new
set artefact_string_value = '02.06.2016'
where artefact_id = 2094 and model_id in ('b9f42847-3717-4774-95fd-9673a2184006');

update artefact_realizations_new
set artefact_string_value = '02.08.2021'
where artefact_id = 2094 and model_id in ('a741ca37-ba75-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '07.03.2014'
where artefact_id = 2094 and model_id in ('22cea9e6-f58f-41c5-84da-c7e7ca56004d');

update artefact_realizations_new
set artefact_string_value = '16.12.2021'
where artefact_id = 2094 and model_id in ('8e45a23d-edcb-4d2a-a190-44d1c37730e0');

update artefact_realizations_new
set artefact_string_value = '21.08.2019'
where artefact_id = 2094 and model_id in ('29a75e3f-d9b3-4d3d-b319-c2dd9033a78e');

update artefact_realizations_new
set artefact_string_value = '25.05.2020'
where artefact_id = 2094 and model_id in ('58a69ebb-05ca-11ec-b149-0242ac11000d','5ff287d5-05cc-11ec-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '27.10.2021'
where artefact_id = 2094 and model_id in ('4dd5fc29-a3b5-11ec-bac6-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '29.01.2014'
where artefact_id = 2094 and model_id in ('1c1274e5-c9a9-49a7-b936-817b7a11b729');

update artefact_realizations_new
set artefact_string_value = '09.07.2012'
where artefact_id = 2094 and model_id in ('d213a7fb-5d38-4c8e-a518-c250a2e98d36');

update artefact_realizations_new
set artefact_string_value = '20.17.2020'
where artefact_id = 2094 and model_id in ('df1094ad-86ea-422f-af56-883f6a4c9f78');

update artefact_realizations_new
set artefact_string_value = '01.08.2013'
where artefact_id = 2094 and model_id in ('e9f8348f-ba1e-4a13-9d8b-0e8314483f3f');

update artefact_realizations_new
set artefact_string_value = '16.12.2021'
where artefact_id = 2094 and model_id in ('e4154cf4-7970-4268-a46c-bf5be1d10b63','5df59179-eec3-44e1-9aff-47e09d69ebe2');

update artefact_realizations_new
set artefact_string_value = '31.08.2021'
where artefact_id = 2094 and model_id in ('116b3e06-6765-4510-bdcd-18bd9d99cbb3');

update artefact_realizations_new
set artefact_string_value = '22.04.2022'
where artefact_id = 2094 and model_id in ('3caa28c3-539e-4c5b-a366-059d9ecccd33');

update artefact_realizations_new
set artefact_string_value = '26.11.2021'
where artefact_id = 2094 and model_id in ('7ba5df22-b0e5-11ec-bac6-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '26.12.2018'
where artefact_id = 2094 and model_id in ('13b48330-2ba7-4624-99bd-365d2125c874','5cdbc53e-0aa3-4987-82ce-7260a31bd76f');

update artefact_realizations_new
set artefact_string_value = '22.04.2022'
where artefact_id = 2094 and model_id in ('69f8a785-b691-11ed-a9f8-0a5801050287',
'69f8a785-b691-11ed-a9f8-0a5801050287',
'4baef1d1-1e43-4f9b-8d8d-5a6665b05504',
'39387ed8-bd6a-49d9-bdbe-223d1f1c2e45',
'99f97e02-c438-4b46-b8bc-7a26a1fb00c5',
'58867691-a897-40fd-a18c-b95e3896df59',
'db2ca7b9-ba75-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '31.12.2019'
where artefact_id = 2094 and model_id in ('163b4a10-33ad-42af-93ab-641d37038bc2');

update artefact_realizations_new
set artefact_string_value = '27.02.2013'
where artefact_id = 2094 and model_id in ('95037dda-c3e6-4333-bdfb-8400cc8e35d1');

update artefact_realizations_new
set artefact_string_value = '25.10.2021'
where artefact_id = 2094 and model_id in ('f3392f85-cf70-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '24.10.2014'
where artefact_id = 2094 and model_id in ('e932c0d2-cf67-4ba1-983c-9b9f14922229');

update artefact_realizations_new
set artefact_string_value = '10.01.2019'
where artefact_id = 2094 and model_id in ('ebf4d40a-017f-47dd-9e5f-cd1ec66a0af9');

update artefact_realizations_new
set artefact_string_value = '25.01.2021'
where artefact_id = 2094 and model_id in ('9933e275-3747-48be-bb3a-255622b6df7f');

update artefact_realizations_new
set artefact_string_value = '17.07.2020'
where artefact_id = 2094 and model_id in ('bd278806-147a-46b0-9a22-8c0ad886b295');

update artefact_realizations_new
set artefact_string_value = '08.02.2021'
where artefact_id = 2094 and model_id in ('e5e16063-55ca-4a6d-8757-ccb5d130ed8f');

update artefact_realizations_new
set artefact_string_value = '09.04.2020'
where artefact_id = 2094 and model_id in ('a25db8d9-b219-4594-9a3c-7388137bee55');

update artefact_realizations_new
set artefact_string_value = '28.03.2011'
where artefact_id = 2094 and model_id in ('6d6a6bcf-82a7-4dbf-8870-203c57313443');

update artefact_realizations_new
set artefact_string_value = '27.06.2022'
where artefact_id = 2094 and model_id in ('e6c64f8b-b692-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '26.01.2023'
where artefact_id = 2094 and model_id in ('ca650916-b693-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '09.03.2022'
where artefact_id = 2094 and model_id in ('24462eaf-d2b7-11ec-aca9-0a58010006b2');

update artefact_realizations_new
set artefact_string_value = '24.05.2022'
where artefact_id = 2094 and model_id in ('1e9639e4-b694-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '27.10.2021'
where artefact_id = 2094 and model_id in ('a8049a9d-ba40-11ec-bac6-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '30.09.2019'
where artefact_id = 2094 and model_id in ('4e27b59d-a1c0-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '26.08.2019'
where artefact_id = 2094 and model_id in ('9c484f61-d05e-41e3-92d5-55f25e11e02d');

update artefact_realizations_new
set artefact_string_value = '27.12.2022'
where artefact_id = 2094 and model_id in ('9938394a-85bb-11ec-bac6-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '01.06.2021'
where artefact_id = 2094 and model_id in ('c4a42f09-596d-4fcb-91c6-1a030d28691c');

update artefact_realizations_new
set artefact_string_value = '01.06.2021'
where artefact_id = 2094 and model_id in ('f24f6771-a1d8-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '31.12.2019'
where artefact_id = 2094 and model_id in ('67a6bf1d-d835-11ec-aca9-0a58010006b2',
'71c4dada-d837-11ec-aca9-0a58010006b2',
'473b3217-d839-11ec-aca9-0a58010006b2',
'3ec37dc7-d838-11ec-aca9-0a58010006b2');

update artefact_realizations_new
set artefact_string_value = '27.07.2022'
where artefact_id = 2094 and model_id in ('47fc3a7d-b306-11eb-8c85-0242ac11000d',
'16154276-b336-11eb-8c85-0242ac11000d',
'16fae526-b87c-4d72-81d7-2fe799431545',
'8c068630-d8b5-11eb-8c85-0242ac11000d',
'64dfb185-67f6-11ec-80d2-0242ac11000d',
'cfcf7cf8-67f6-11ec-80d2-0242ac11000d',
'534e644e-6b08-11ed-a9f8-0a5801050287',
'534e644e-6b08-11ed-a9f8-0a5801050287',
'534e644e-6b08-11ed-a9f8-0a5801050287',
'59632863-d1f7-11eb-8c85-0242ac11000d',
'59632863-d1f7-11eb-8c85-0242ac11000d',
'59632863-d1f7-11eb-8c85-0242ac11000d',
'deeba9b0-6b08-11ed-a9f8-0a5801050287',
'deeba9b0-6b08-11ed-a9f8-0a5801050287',
'deeba9b0-6b08-11ed-a9f8-0a5801050287',
'2913cc6a-d1f8-11eb-8c85-0242ac11000d',
'2913cc6a-d1f8-11eb-8c85-0242ac11000d',
'2913cc6a-d1f8-11eb-8c85-0242ac11000d',
'df669a7d-d1f8-11eb-8c85-0242ac11000d',
'df669a7d-d1f8-11eb-8c85-0242ac11000d',
'df669a7d-d1f8-11eb-8c85-0242ac11000d',
'df669a7d-d1f8-11eb-8c85-0242ac11000d',
'ed0efa2a-6b0a-11ed-a9f8-0a5801050287',
'5fe61677-6b0b-11ed-a9f8-0a5801050287',
'd7d078f7-d910-11eb-8c85-0242ac11000d',
'78465da1-f135-11eb-b149-0242ac11000d',
'ad7735c0-f13a-11eb-b149-0242ac11000d',
'70354e1b-f13e-11eb-b149-0242ac11000d',
'1602d047-ff7d-11eb-b149-0242ac11000d',
'791ab028-ff84-11eb-b149-0242ac11000d',
'5386e345-fe80-11eb-b149-0242ac11000d',
'5386e345-fe80-11eb-b149-0242ac11000d',
'5386e345-fe80-11eb-b149-0242ac11000d',
'5386e345-fe80-11eb-b149-0242ac11000d',
'fcd0233c-fe80-11eb-b149-0242ac11000d',
'fcd0233c-fe80-11eb-b149-0242ac11000d',
'fcd0233c-fe80-11eb-b149-0242ac11000d',
'445ec613-fe81-11eb-b149-0242ac11000d',
'445ec613-fe81-11eb-b149-0242ac11000d',
'445ec613-fe81-11eb-b149-0242ac11000d',
'ade621d9-fe93-11eb-b149-0242ac11000d',
'fa442720-fe93-11eb-b149-0242ac11000d',
'fa442720-fe93-11eb-b149-0242ac11000d',
'fa442720-fe93-11eb-b149-0242ac11000d',
'c620e16e-67f3-11ec-80d2-0242ac11000d',
'be42b1b6-ace3-4879-aeda-38a230cc0481',
'972541ae-69aa-4786-b8ad-a090ab89da2c');

update artefact_realizations_new
set artefact_string_value = '26.06.2008'
where artefact_id = 2094 and model_id in ('4601a6f4-95ab-4866-a33a-d1dd66d53c53',
'14e5e14b-83c4-4d7a-a416-f77cd3c60079',
'8c841756-ea49-4523-929a-f4282a5517fe');

update artefact_realizations_new
set artefact_string_value = '25.11.2022'
where artefact_id = 2094 and model_id in ('b626cdc2-b692-11ed-a9f8-0a5801050287',
'749ab890-74b6-11ed-a9f8-0a5801050287',
'fa91b158-b044-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '25.05.2020'
where artefact_id = 2094 and model_id in ('e603b9d5-05c6-11ec-b149-0242ac11000d','ab63eaad-05c9-11ec-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '24.08.2021'
where artefact_id = 2094 and model_id in ('591396a6-4d24-11ec-80d2-0242ac11000d',
'591396a6-4d24-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '24.03.2023'
where artefact_id = 2094 and model_id in ('d3758c5e-758a-40c4-a2cb-ab68ae63ae80','54a8a438-e3cb-4509-8fd3-bbdeaf24574d');

update artefact_realizations_new
set artefact_string_value = '24.09.2020'
where artefact_id = 2094 and model_id in ('10e8ec2b-1ad1-11ec-b149-0242ac11000d',
'8c240bda-b98a-11eb-8c85-0242ac11000d',
'c46815d6-b950-11eb-8c85-0242ac11000d',
'7a73a7ac-b989-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '24.03.2021'
where artefact_id = 2094 and model_id in ('c07b32f3-9258-11ed-a9f8-0a5801050287',
'32a38d05-9258-11ed-a9f8-0a5801050287
');

update artefact_realizations_new
set artefact_string_value = '20.03.2013'
where artefact_id = 2094 and model_id in ('425504b1-a41d-4576-be30-e777a5657f5d',
'4675f6a6-2822-4b71-afc9-62973cfb4ec3
');

update artefact_realizations_new
set artefact_string_value = '19.10.2020'
where artefact_id = 2094 and model_id in ('92cf344d-05cd-11ec-b149-0242ac11000d','e086ca8f-05cc-11ec-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '17.05.2018'
where artefact_id = 2094 and model_id in ('54c7969f-1abd-11ec-b149-0242ac11000d',
'cab00d2f-b966-11eb-8c85-0242ac11000d',
'f8182e2f-a1c7-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '13.09.2021'
where artefact_id = 2094 and model_id in ('edd13d51-b131-11ed-a9f8-0a5801050287','5294590c-cf71-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '27.05.2008'
where artefact_id = 2094 and model_id in ('fb90ab37-3eb7-4247-b480-41cc2e2a3576','
d7d29ad6-fbb4-4497-b0ff-5142e647f0c2
');

update artefact_realizations_new
set artefact_string_value = '22.09.2021'
where artefact_id = 2094 and model_id in ('3bb84a65-5287-47d8-a26a-9be9f9934fc0',
'8e17b101-bc8b-4238-93ae-bdfcd889d1f5',
'b18036b9-3f73-4d66-9a30-cb8731711340');

update artefact_realizations_new
set artefact_string_value = '06.11.2019'
where artefact_id = 2094 and model_id in ('af0e8ff7-e4a4-43cf-921b-18ab076ea23d','4606b183-2caf-4246-8e3b-450c7d04a3f0');

update artefact_realizations_new
set artefact_string_value = '29.12.2021'
where artefact_id = 2094 and model_id in ('8d13bae6-33b4-40f6-8eef-0278cf10b5d4',
'e0faa905-923d-4da7-9ce4-66b5b00cf330');

delete
from artefact_realizations_new
where  artefact_id = 2094 and artefact_string_value in ('нет', 'нет
');

update artefact_realizations_new
set artefact_string_value = '30.09.2019'
where artefact_id = 2094 and model_id in ('f7ccc236-147c-4947-8671-1eca2e914f61');

update artefact_realizations_new
set artefact_string_value = '29.10.2020'
where artefact_id = 2094 and model_id in ('c534601e-cde9-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '27.05.2008'
where artefact_id = 2094 and model_id in ('d7d29ad6-fbb4-4497-b0ff-5142e647f0c2');

update artefact_realizations_new
set artefact_string_value = '01.02.2015'
where artefact_id = 2094 and model_id in ('4a5fbdc6-4aba-4982-82d2-80f59b3ddc36');

update artefact_realizations_new
set artefact_string_value = '07.06.2018'
where artefact_id = 2094 and model_id in ('20cab56f-d46f-4bcb-a672-c72dd45cfc18');

update artefact_realizations_new
set artefact_string_value = '02.10.2013'
where artefact_id = 2094 and model_id in ('f84a47ef-e3b0-4865-9436-3f6b10a193c1');

update artefact_realizations_new
set artefact_string_value = '03.06.2019'
where artefact_id = 2094 and model_id in ('9f177937-3c64-4476-8f27-b85a24465200','e79a535d-45a9-4cae-8902-ae668f5eefc5');

update artefact_realizations_new
set artefact_string_value = '06.09.2013'
where artefact_id = 2094 and model_id in ('b3c89ed6-b905-463f-8cdc-05282941fa69');

update artefact_realizations_new
set artefact_string_value = '07.03.2014'
where artefact_id = 2094 and model_id in ('15371a3f-2b5a-43cb-9f22-a363ff3329d2');

update artefact_realizations_new
set artefact_string_value = '09.08.2022'
where artefact_id = 2094 and model_id in ('42a186d8-b044-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '10.01.2019'
where artefact_id = 2094 and model_id in ('c77a050e-bd75-4df3-996d-e60151803278');

update artefact_realizations_new
set artefact_string_value = '10.12.2018'
where artefact_id = 2094 and model_id in ('74ca9203-b744-485f-9e66-971aff0641b7');

update artefact_realizations_new
set artefact_string_value = '11.07.2012'
where artefact_id = 2094 and model_id in ('ac7957eb-d67a-42b0-b298-948e67be736e');

update artefact_realizations_new
set artefact_string_value = '12.04.2022'
where artefact_id = 2094 and model_id in ('8f1d3e9c-ddaf-4a70-bb47-9bce6d757cab');

update artefact_realizations_new
set artefact_string_value = '13.09.2022'
where artefact_id = 2094 and model_id in ('14ddd883-f97b-11ed-8670-0a5801010376');

update artefact_realizations_new
set artefact_string_value = '16.10.2012'
where artefact_id = 2094 and model_id in ('592e9c24-f73c-4b10-8e21-e1513146c929');

update artefact_realizations_new
set artefact_string_value = '16.04.2021'
where artefact_id = 2094 and model_id in ('394a5576-3ae4-11ec-80d2-0242ac11000d','bf59b094-1fd3-11ed-bcf6-0a58010403c1');

update artefact_realizations_new
set artefact_string_value = '30.05.2023'
where artefact_id = 2094 and model_id in ('931c0104-a871-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '29.05.2023'
where artefact_id = 2094 and model_id in ('c48b6ac4-c857-4e27-9a6e-a62dde3dbd19');

update artefact_realizations_new
set artefact_string_value = '28.03.2022'
where artefact_id = 2094 and model_id in ('71aa7faf-b955-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '26.03.2022'
where artefact_id = 2094 and model_id in ('b9cb1b89-0356-11ed-be79-0a58010207de');

update artefact_realizations_new
set artefact_string_value = '24.06.2022'
where artefact_id = 2094 and model_id in ('fb1a3818-70e3-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '24.05.2011'
where artefact_id = 2094 and model_id in ('476e1dcf-036f-4383-960b-cee462b90885');

update artefact_realizations_new
set artefact_string_value = '24.03.2021'
where artefact_id = 2094 and model_id in ('32a38d05-9258-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '23.12.2021'
where artefact_id = 2094 and model_id in ('5c146935-b96c-11eb-8c85-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '23.10.2020'
where artefact_id = 2094 and model_id in ('321adfcf-05c9-11ec-b149-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '23.04.2021'
where artefact_id = 2094 and model_id in ('06700e85-ba6a-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '22.11.2013'
where artefact_id = 2094 and model_id in ('16cb522c-dd18-4c0b-86f2-dd8bd83eec4e');

update artefact_realizations_new
set artefact_string_value = '21.09.2010'
where artefact_id = 2094 and model_id in ('c7895ae8-bd67-45d1-b411-83daa1b169a5');

update artefact_realizations_new
set artefact_string_value = '21.05.2021'
where artefact_id = 2094 and model_id in ('54b2f3a8-ba74-11ed-a9f8-0a5801050287');

update artefact_realizations_new
set artefact_string_value = '20.03.2013'
where artefact_id = 2094 and model_id in ('4675f6a6-2822-4b71-afc9-62973cfb4ec3');

update artefact_realizations_new
set artefact_string_value = '20.02.2023'
where artefact_id = 2094 and model_id in ('f2c761fc-f97b-11ed-8670-0a5801010376');

update artefact_realizations_new
set artefact_string_value = '19.06.2019'
where artefact_id = 2094 and model_id in ('53c77b2c-73a2-456d-804b-0297da05b637');

update artefact_realizations_new
set artefact_string_value = '18.12.2013'
where artefact_id = 2094 and model_id in ('a4c97231-5ca5-4190-99ae-b536c04afc4c');

update artefact_realizations_new
set artefact_string_value = '17.10.2018'
where artefact_id = 2094 and model_id in ('21138fbe-8052-4231-8ddc-cdf91d442147');

delete
from artefact_realizations_new
where  artefact_id = 2061 and artefact_string_value in ('регулятор не утверждает ВНД Банка');

update artefact_realizations_new
set artefact_string_value = '01.12.2022'
where artefact_id = 2062;

update artefact_realizations_new
set artefact_string_value = '17.11.2022'
where artefact_id = 2063 and model_id in ('bf59b094-1fd3-11ed-bcf6-0a58010403c1',
'394a5576-3ae4-11ec-80d2-0242ac11000d',
'591396a6-4d24-11ec-80d2-0242ac11000d',
'591396a6-4d24-11ec-80d2-0242ac11000d',
'c4a42f09-596d-4fcb-91c6-1a030d28691c');

update artefact_realizations_new
set artefact_string_value = '17.11.2022'
where artefact_id = 2067 and model_id in ('bf59b094-1fd3-11ed-bcf6-0a58010403c1',
'394a5576-3ae4-11ec-80d2-0242ac11000d');

update artefact_realizations_new
set artefact_string_value = '17.11.2022'
where artefact_id = 2063 and model_id in ('bf59b094-1fd3-11ed-bcf6-0a58010403c1',
'394a5576-3ae4-11ec-80d2-0242ac11000d',
'591396a6-4d24-11ec-80d2-0242ac11000d',
'591396a6-4d24-11ec-80d2-0242ac11000d',
'c4a42f09-596d-4fcb-91c6-1a030d28691c');

update artefact_realizations_new
set artefact_string_value = '17.11.2022'
where artefact_id = 2067 and model_id in ('bf59b094-1fd3-11ed-bcf6-0a58010403c1',
'394a5576-3ae4-11ec-80d2-0242ac11000d');

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2097, 'decision_date_and_number_of_application_model_for_segment', 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента',
        'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2098, 'notification_date_and_number_of_application_model_for_segment', 'Дата и номер уведомления БР о применении РС / Модели для сегмента',
        'Дата и номер уведомления БР о применении РС / Модели для сегмента', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер уведомления БР о применении РС / Модели для сегмента', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2099, 'decision_date_and_number_of_application_model', 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для всех сегментов',
        'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для всех сегментов', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для всех сегментов', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2100, 'notification_date_and_number_of_application_model', 'Дата и номер уведомления БР о применении РС / Модели',
        'Дата и номер уведомления БР о применении РС / Модели', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер уведомления БР о применении РС / Модели', null);

INSERT INTO artefact_realizations_new (model_id,artefact_custom_type,artefact_string_value) VALUES
('bf59b094-1fd3-11ed-bcf6-0a58010403c1','decision_date_and_number_of_application_model_for_segment','№ 4-1/0 от 17.11.2022'),
('394a5576-3ae4-11ec-80d2-0242ac11000d','decision_date_and_number_of_application_model_for_segment','№ 4-1/0 от 17.11.2022'),
('591396a6-4d24-11ec-80d2-0242ac11000d','decision_date_and_number_of_application_model_for_segment','№ 4-1/0 от 17.11.2022'),
('c4a42f09-596d-4fcb-91c6-1a030d28691c','decision_date_and_number_of_application_model_for_segment','№ 4-1/0 от 17.11.2022'),
('bf59b094-1fd3-11ed-bcf6-0a58010403c1','decision_date_and_number_of_application_model','№ 4-1/0 от 17.11.2022'),
('394a5576-3ae4-11ec-80d2-0242ac11000d','decision_date_and_number_of_application_model','№ 4-1/0 от 17.11.2022');

UPDATE artefact_realizations_new as ar
SET artefact_id= a.artefact_id
FROM artefacts AS a
WHERE a.artefact_tech_label = ar.artefact_custom_type
and ar.artefact_id is null ;
