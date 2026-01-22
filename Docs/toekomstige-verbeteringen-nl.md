## Toekomstige Verbeteringen

### Fase 1: Snelle Winst (Geen Infrastructuurwijzigingen)

Deze verbeteringen behouden het huidige eenvoudige implementatiemodel en kunnen snel worden geïmplementeerd:

1. **Ondersteuning voor Meerdere Sjablonen**: Selecteer tussen verschillende labelformaten met behulp van een vervolgkeuzemenu
2. **Excel Upload Functie**: Sta gebruikers toe om nieuwe productbestanden direct via de interface te uploaden in plaats van serverbestanden te vervangen
3. **Datavalidatie & Kwaliteitscontroles**: Automatisch ontbrekende of onvolledige gegevensvelden detecteren en markeren, Excel bestandsstructuur valideren bij laden, en waarschuwingen over gegevensvolledigheid geven vóór labelgeneratie
4. **Labelgeneratie Verbeteringen**: Handmatige lettertypegrootte aanpassingen, veldlengtwaarschuwingen, sjabloonvalidatie, en verbeterde verwerking van speciale tekens
5. **Workflow Efficiëntie Verbeteringen**: Sneltoetsen voor snellere navigatie, sessigeheugen om laatste zoekopdracht te herstellen, snelle regeneratiefunctionaliteit, en detectie van dubbele generatie
6. **Batch Download Operaties**: Multi-selecteer producten uit zoekresultaten, genereer meerdere labels tegelijk, en download als georganiseerde ZIP-bestanden

### Fase 2: Verbeterde Functies (Meer Ontwikkelinspanning)

Deze functies zijn haalbaar met de huidige architectuur maar vereisen meer ontwikkeltijd:

7. **Exportgeschiedenis met Herdruk**: Volg eerder gegenereerde labels met tijdstempels en herdrukmogelijkheid
   - *Opmerking: Geschiedenis wordt lokaal opgeslagen in de browser; niet gedeeld tussen gebruikers of apparaten*

8. **Visuele Labelvoorbeeld**: Toon labelweergave voordat deze wordt gegenereerd
   - *Opmerking: Vereist ZPL rendering bibliotheek; als alternatief kan sjabloon met vervangen waarden worden getoond (eenvoudigere implementatie)*

### Fase 3: Geavanceerde Functies (Vereist Architectuurbeslissingen)

Deze functies zouden wijzigingen in het implementatiemodel of aanvullende infrastructuur vereisen:

9. **Directe Printercommunicatie**: Stuur printopdrachten rechtstreeks naar geconfigureerde netwerkprinters zonder handmatige bestandsoverdracht
   - *Technische vereiste: Zou een desktopapplicatie (Electron), browserextensie, of lokale printserver middleware nodig hebben*
   - *Alternatief: Doorgaan met handmatige bestandsoverdracht of batch ZIP-download*

10. **Printer Output Testen & Validatie**: Geautomatiseerd testen van .zbl labeloutput van geïmplementeerde labelprinters
    - *Opmerking: Dit is primair een handmatig QA-proces dat fysieke printertoegang vereist; de app kan testlabelsjablonen en validatiechecklists bieden*
